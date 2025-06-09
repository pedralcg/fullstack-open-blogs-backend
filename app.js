const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const middleware = require('./utils/middleware')
const logger = require('./utils/logger')

logger.info('Connecting to MongoDB')

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    logger.info('CONNECTED to MongoDB')
  })
  .catch((error) => {
    logger.error('Error connecting to MongoDB:', error.message)
  })

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: String,
  url: {
    type: String,
    required: true
  },
  likes: {
    type: Number,
    default: 0
  }
})

//! Transformar _id a id y eliminar __v
blogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString() // Renombra _id a id
    delete returnedObject._id // Elimina la propiedad _id
    delete returnedObject.__v // Elimina la propiedad __v (versión de Mongoose)
  }
})

const Blog = mongoose.model('Blog', blogSchema)

app.use(cors())
app.use(express.json())

// Antes:
// app.get('/api/blogs', (request, response) => {
//   Blog
//     .find({})
//     .then(blogs => {
//       response.json(blogs)
//     })
// })

// Después (con async/await):
app.get('/api/blogs', async (request, response /* , next */) => {
  const blogs = await Blog.find({}) // Usa 'await' para esperar la operación de la DB
  response.json(blogs) // Envía la respuesta JSON
})

// Antes:
// app.post('/api/blogs', (request, response) => {
//   const blog = new Blog(request.body)

//   blog
//     .save()
//     .then(result => {
//       response.status(201).json(result)
//     })
// })

// Después (con async/await y try...catch básico):
app.post('/api/blogs', async (request, response, next) => {
  const body = request.body

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes || 0
  })

  try { // Añade un try-catch para manejar errores de await
    const savedBlog = await blog.save() // Usa 'await' para esperar la operación de guardado
    response.status(201).json(savedBlog) // Cambia el código de estado a 201 CREATED
  } catch (error) {
    next(error) // Pasa el error al middleware de manejo de errores de Express
  }
})


//! Orden de los middlewares de error es CRÍTICO
// Usar el middleware de endpoint desconocido DESPUÉS de todas las rutas válidas
app.use(middleware.unknownEndpoint)

// Usar el middleware de manejo de errores DESPUÉS del de unknownEndpoint
app.use(middleware.errorHandler)

module.exports = app