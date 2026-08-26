import { useEffect, useState } from 'react'
import './AboutPage.css'
import { SiteNavigation } from '../../components/SiteNavigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth.ts'

type Rating = 0 | 1 | 2 | 3 | 4 | 5

const ratingLabels = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز!']

const steps = [
  { number: '١', icon: 'search', title: 'تصفح وابحث', description: 'أدخل مدينتك واستعرض الكتب المتاحة في المساجد القريبة منك. ابحث بالعنوان أو المؤلف أو التصنيف، أو تصفح حسب المسجد. لا يلزمك حساب للبحث.' },
  { number: '٢', icon: 'mosque', title: 'اعثر على الكتاب', description: 'تعرف على المسجد الذي يحتوي على الكتاب الذي تبحث عنه، واعرف المحافظة والمدينة والطبعة المتاحة. ثم اذهب وخذ الكتاب.' },
  { number: '٣', icon: 'book', title: 'ساهم وسجّل', description: 'إذا وجدت كتابًا غير مسجّل، أنشئ حسابًا مجانيًا وسجّله. طلبك يُرسَل للمراجعة ويظهر للجميع عند الموافقة عليه.' },
]

function LineIcon({ name }: { name: 'search' | 'mosque' | 'book' | 'send' | 'check' }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    mosque: <><path d="M4 20h16M6 20v-7m12 7v-7M3 13h18M5 13l7-6 7 6M10 13v7m4-7v7M12 4v3" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export default function AboutPage() {
  const { user } = useAuth()
  const [rating, setRating] = useState<Rating>(0)
  const [hoverRating, setHoverRating] = useState<Rating>(0)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    const elements = document.querySelectorAll('.about-reveal')
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  async function submitFeedback() {
    if (!message.trim()) return
    setFeedbackError(null)
    if (!supabase) {
      setFeedbackError('تعذر الإرسال: إعدادات الخادم غير متوفرة حالياً. حاول لاحقاً أو راسلنا مباشرة.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      message: message.trim(),
      email: email.trim() || null,
      rating: rating || null,
    })
    setSubmitting(false)
    if (error) {
      setFeedbackError('حدث خطأ أثناء إرسال رأيك. يرجى المحاولة مرة أخرى.')
      return
    }
    setSubmitted(true)
  }

  const displayedRating = hoverRating || rating

  return <div className="site-layout about-page" dir="rtl">
    <SiteNavigation active="about" />
    <div className="site-content">
      <main>
        <section className="about-hero" aria-labelledby="about-heading">
          <div className="about-hero-inner">
            <div className="about-ornament" aria-hidden="true"><span /><b /><span /></div>
            <div className="about-quote-mark" aria-hidden="true">❝</div>
            <blockquote>معظم المساجد يكون بها <em>مكتبة ثرية بالكتب</em> — ولا يكاد يقرأها أحد وهي تحت التراب على رفوف المساجد.</blockquote>
            <div className="about-divider" aria-hidden="true" />
            <h1 id="about-heading">على <span>رفوف</span> المساجد</h1>
            <p>منصة مجتمعية لفهرسة كتب مكتبات المساجد في مصر، تجعلها قابلة للبحث والاستكشاف من أي مكان.</p>
          </div>
          <div className="about-wave" aria-hidden="true" />
        </section>

        <section className="about-section how-section" aria-labelledby="how-heading">
          <div className="about-container">
            <header className="about-section-header about-reveal"><div className="about-label">كيف تعمل المنصة</div><h2 id="how-heading">ثلاث خطوات بسيطة</h2><p>سواء كنت تبحث عن كتاب أو تريد إضافة ما وجدته في مسجدك — العملية كلها بسيطة وسريعة.</p></header>
            <div className="steps-grid">{steps.map((step, index) => <article className={`step-card about-reveal delay-${index + 1}`} key={step.number}><div className="step-top"><span className="step-number">{step.number}</span><span className="step-icon"><LineIcon name={step.icon as 'search' | 'mosque' | 'book'} /></span></div><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
          </div>
        </section>

        <section className="volunteer-section" aria-labelledby="volunteer-heading">
          <div className="volunteer-inner">
            <div className="about-reveal"><div className="about-label">للمتطوعين</div><h2 id="volunteer-heading">انضم إلى فريق الفهرسة</h2><p className="volunteer-intro">المتطوعون هم عمود المنصة. إضافاتهم تُعتمد فورًا دون مراجعة، ويمكنهم تعديل ما سجّلوه في أي وقت.</p><ul>{['الإضافات تظهر للجميع فورًا دون انتظار موافقة', 'إمكانية تعديل التسجيلات وتحديثها في أي وقت', 'المساهمة في إحياء تراث مكتبات المساجد'].map((item) => <li key={item}><span><LineIcon name="check" /></span>{item}</li>)}</ul><a className="about-primary-button" href="#contact"><LineIcon name="send" />تواصل معنا للتطوع</a></div>
            <div className="volunteer-visual" aria-hidden="true"><div className="volunteer-stack">{['الرقائق والمواعظ', 'فقه السيرة النبوية', 'تفسير ابن كثير'].map((title, index) => <div className={`vol-card vol-card-${index + 1}`} key={title}><strong>{title}</strong><small>{['مسجد الرحمة — القاهرة', 'مسجد النور — الجيزة', 'مسجد العمري — الإسكندرية'][index]}</small><mark>{index === 0 ? 'قيد المراجعة' : '✓ مُعتمد'}</mark></div>)}</div></div>
          </div>
        </section>

        <section className="feedback-section" aria-labelledby="feedback-heading"><div className="feedback-inner"><header className="about-section-header centered about-reveal"><div className="about-label">أرسل رأيك</div><h2 id="feedback-heading">رأيك يهمنا</h2><p>ساعدنا في تحسين المنصة بمشاركة ملاحظاتك أو اقتراحاتك. يمكنك الإرسال بدون حساب.</p></header><div className="feedback-card about-reveal delay-1">{submitted ? <div className="feedback-success" role="status"><span><LineIcon name="check" /></span><h3>شكرًا على رأيك!</h3><p>وصلنا رأيك بنجاح.<br />كل ملاحظة تساعدنا على تحسين المنصة.</p></div> : <><div className="star-rating" role="group" aria-label="تقييمك للمنصة (اختياري)">{([1, 2, 3, 4, 5] as Rating[]).map((value) => <button type="button" key={value} className={value <= displayedRating ? 'selected' : ''} aria-label={`${ratingLabels[value]}: ${value} نجوم`} onMouseEnter={() => setHoverRating(value)} onMouseLeave={() => setHoverRating(0)} onFocus={() => setHoverRating(value)} onBlur={() => setHoverRating(0)} onClick={() => setRating(value)}>★</button>)}</div><p className="rating-label">{displayedRating ? ratingLabels[displayedRating] : 'اختر تقييمك للمنصة'}</p><label>رسالتك <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب ملاحظاتك أو اقتراحاتك هنا..." required /></label><label>بريدك الإلكتروني <small>(اختياري — للرد عليك)</small><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" dir="ltr" /></label>{feedbackError && <p className="feedback-error" role="alert">{feedbackError}</p>}<button className="about-submit-button" type="button" disabled={submitting || !message.trim()} onClick={submitFeedback}>{submitting ? 'جارٍ الإرسال...' : 'إرسال الرأي'}</button></>}</div></div></section>

        <section className="contact-strip" id="contact"><div><strong>هل لديك سؤال أو تريد التواصل مع الفريق؟</strong><span>نحن نتواصل عبر تيليغرام وبريد المشروع</span></div><a className="contact-button" href="mailto:belalamrofficial@gmail.com"><LineIcon name="send" />تواصل مع الفريق</a></section>
        <footer className="about-footer"><div><strong>على رفوف المساجد</strong><span>نُعيد الكتب إلى النور</span></div><p>مشروع مجتمعي مفتوح لفهرسة مكتبات المساجد في مصر.<br />تطوير بدعم من <a href="#contact">فريق المتطوعين</a></p></footer>
      </main>
    </div>
  </div>
}