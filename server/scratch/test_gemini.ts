import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('d:/New folder/Project/VidyaVAult/server/.env') })

const apiKey = process.env.GEMINI_API_KEY

async function testGemini() {
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing')
    return
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  
  try {
    // List models to check what's available
    // Note: The SDK might not have a direct listModels on genAI in all versions, 
    // but we can try to hit the endpoint or just try a different model name.
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })
    const result = await model.generateContent('Say "Gemini Flash is working!"')

    console.log(result.response.text())
  } catch (error) {
    console.error('Gemini API Error:', error)
  }
}

testGemini()
