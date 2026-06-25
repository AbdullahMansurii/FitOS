import crypto from 'crypto'

async function deriveSyncToken(password) {
  const encoder = new TextEncoder()
  const salt = 'fitos-owner-salt-2026'
  const data = encoder.encode(password + salt)
  
  // Use crypto.webcrypto.subtle in Node to match the browser's crypto.subtle API
  const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

deriveSyncToken("Sumaiyya").then(token => {
  console.log("Password: Sumaiyya")
  console.log("Derived Token:", token)
})
