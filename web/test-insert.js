import { createClient } from "@supabase/supabase-js"


const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  console.log("Logging in...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "belalamrofficial@gmail.com",
    password: "Password123!" // Let's try a default password, or we can just sign in, but wait, we don't have the password.
  })
  
  if (authError) {
    console.log("Cannot log in:", authError.message)
    return
  }
  console.log("Logged in:", authData.user.id)
  
  const entry = await supabase.from("mosque_books").insert({
    book_id: "1aa4c2e8-fd47-48e8-a09d-29a3675cad40",
    mosque_id: "d78841d7-60e0-4ce6-bec6-947778e62fa8",
    edition: "Test Edition",
    publisher: "Test Publisher",
    submitted_by: authData.user.id,
    status: "approved"
  }).select("id").single()
  
  console.log("Insert result:", entry)
}

testInsert()
