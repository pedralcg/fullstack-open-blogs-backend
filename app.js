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


//* Método GET /api/blogs/
app.get('/api/blogs', async (request, response /* , next */) => {
  const blogs = await Blog.find({}) // Usa 'await' para esperar la operación de la DB
  response.json(blogs) // Envía la respuesta JSON
})


//* Método POST /api/blogs/
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


//* Método DELETE /api/blogs/:id
app.delete('/api/blogs/:id', async (request, response, next) => {
  try {
    // Usa findByIdAndDelete para encontrar y eliminar el blog por su ID
    await Blog.findByIdAndDelete(request.params.id)

    // Si la eliminación fue exitosa, responde con 204 No Content
    response.status(204).end()
  } catch (error) {
    // Pasa cualquier error (ej. ID mal formado, problemas de DB) al middleware de errores
    next(error)
  }
})


//* Método PUT /api/blogs/:id
app.put('/api/blogs/:id', async (request, response, next) => {
  const body = request.body // El cuerpo de la solicitud contiene los datos actualizados
  const id = request.params.id // El ID del blog a actualizar

  // Crea un objeto con solo las propiedades que quieres actualizar.
  const blog = {
    title: body.title, // Incluir para mantener los valores existentes si no se envían
    author: body.author, // y asegurar que Mongoose no los elimine
    url: body.url,
    likes: body.likes, // Este es el campo principal a actualizar
  }

  try {
    // findByIdAndUpdate encuentra un documento por ID y lo actualiza.
    const updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true, runValidators: true, context: 'query' })

    // Si updatedBlog es null, significa que no se encontró el blog con ese ID.
    if (updatedBlog) {
      response.json(updatedBlog) // Responde con el blog actualizado
    } else {
      // Si no se encontró el blog, responde con 404 Not Found.
      response.status(404).end()
    }

  } catch (error) {
    // Pasa cualquier error (ej. ID mal formado, validación fallida) al middleware de errores
    next(error)
  }
})


//! Orden de los middlewares de error es CRÍTICO
// Usar el middleware de endpoint desconocido DESPUÉS de todas las rutas válidas
app.use(middleware.unknownEndpoint)

// Usar el middleware de manejo de errores DESPUÉS del de unknownEndpoint
app.use(middleware.errorHandler)

module.exports = app