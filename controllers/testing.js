const testingRouter = require('express').Router()
const Blog = require('../models/blog') // Asegúrate de que la ruta sea correcta
const User = require('../models/user') // Asegúrate de que la ruta sea correcta

testingRouter.post('/reset', async (request, response) => {
  // Elimina todos los blogs de la base de datos
  await Blog.deleteMany({})
  // Elimina todos los usuarios de la base de datos
  await User.deleteMany({})

  response.status(204).end() // Envía una respuesta 204 No Content para indicar éxito sin contenido
})

module.exports = testingRouter