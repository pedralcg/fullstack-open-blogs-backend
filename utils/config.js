require('dotenv').config()

const PORT = process.env.PORT

// Usar la URI de prueba si NODE_ENV es 'test'
const MONGODB_URI = process.env.NODE_ENV === 'test'
  ? process.env.TEST_MONGODB_URI
  : process.env.MONGODB_URI

module.exports = {
  MONGODB_URI,
  PORT
}