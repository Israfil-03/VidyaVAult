import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('d:/New folder/Project/VidyaVAult/server/.env') })

const apiKey = process.env.GEMINI_API_KEY

async function listModels() {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing')
    return
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await response.json()
    if (data.models) {
      console.log('Available Models:', data.models.map((m: any) => m.name).join(', '))
    } else {
      console.log('No models found or error:', data)
    }
  } catch (error) {
    console.error('Fetch Error:', error)
  }
}

listModels()
