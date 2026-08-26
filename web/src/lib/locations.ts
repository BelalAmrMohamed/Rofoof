// web/src/lib/locations.ts
// Shared location constants used by SubmitPage, ProfilePage, and BrowsePage.
// Split out of SubmitPage.tsx so those files can import plain data without
// pulling in a page component (also avoids a react-refresh lint warning
// about a component file exporting non-component values).

export const COUNTRIES = [
  'مصر', 'السعودية', 'الإمارات', 'المغرب', 'الجزائر', 'تونس', 'ليبيا', 'السودان',
  'الأردن', 'فلسطين', 'سوريا', 'لبنان', 'العراق', 'اليمن', 'الكويت', 'قطر',
  'البحرين', 'عُمان', 'باكستان', 'تركيا', 'إندونيسيا', 'ماليزيا', 'الصومال',
  'موريتانيا', 'مالي', 'النيجر', 'السنغال', 'جيبوتي',
]

// Full static list of Egypt's 27 governorates. This must NOT be derived from
// existing mosque rows — doing so previously meant a governorate only
// appeared in the dropdown once a mosque had already been submitted there,
// making it impossible to be the first submission in a new governorate.
export const EGYPT_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'القليوبية', 'الإسكندرية', 'البحيرة', 'مطروح',
  'الدقهلية', 'دمياط', 'الشرقية', 'الغربية', 'كفر الشيخ', 'المنوفية',
  'بورسعيد', 'الإسماعيلية', 'السويس', 'شمال سيناء', 'جنوب سيناء',
  'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر',
  'أسوان', 'البحر الأحمر', 'الوادي الجديد',
].sort()