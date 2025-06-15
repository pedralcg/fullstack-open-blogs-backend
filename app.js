const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
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
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // El tipo es un ObjectId de Mongoose
    ref: 'User' // La referencia es al modelo 'User'
  }
})

// Configura la transformación de los objetos Blog a JSON para la API
blogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString() // Renombra _id a id
    delete returnedObject._id // Elimina la propiedad _id
    delete returnedObject.__v // Elimina la propiedad __v (versión de Mongoose)
  }
})

const Blog = mongoose.model('Blog', blogSchema)

// Middlewares estándar
app.use(cors())
app.use(express.json())


//! --- Rutas de la API ---

//* Método GET /api/blogs/ - Obtener todos los blogs
app.get('/api/blogs', async (request, response) => {
  //* Añadir .populate() aquí!
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  // { username: 1, name: 1 } significa que solo queremos los campos 'username' y 'name' del usuario.
  // (el id siempre se incluye por defecto)
  response.json(blogs)
})


//* Método POST /api/blogs/ - Crear un nuevo blog
app.post('/api/blogs', async (request, response, next) => {
  const body = request.body

  try {
    //* Encontrar un usuario para asignar el blog
    const users = await mongoose.model('User').find({}) // Obtiene todos los usuarios
    if (users.length === 0) {
      // Si no hay usuarios, no podemos asignar un creador.
      return response.status(400).json({ error: 'cannot create blog without an existing user' })
    }
    const user = users[0] // Selecciona el primer usuario de la base de datos

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes || 0,
    user: user._id
  })

  const savedBlog = await blog.save() // Guarda el blog

    //* Añadir el blog a la lista de blogs del usuario
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save() // Guarda el usuario actualizado con la referencia al nuevo blog

    response.status(201).json(savedBlog) // Responde con el blog guardado
    // Nota: Para este ejercicio no se pide popular el user en la respuesta POST, pero lo haremos en el GET.
  } catch (error) {
    next(error)
  }
})

//* Método DELETE /api/blogs/:id - Eliminar un blog
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


//* Método PUT /api/blogs/:id - Actualizar un blog
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

//! Monta el router de usuarios en la ruta base /api/users
app.use('/api/users', usersRouter)

//! Monta el router de login en la ruta base /api/login
app.use('/api/login', loginRouter) // Monta el router de login en /api/login


//! --- Middlewares de Manejo de Errores ---
// Importante: Estos middlewares deben ir DESPUÉS de todas las rutas,
// ya que Express los procesa en orden.

// Middleware para manejar solicitudes a endpoints desconocidos (404 Not Found)
app.use(middleware.unknownEndpoint)

// Middleware centralizado para el manejo de errores (ValidationError, CastError, etc.)
app.use(middleware.errorHandler)


module.exports = app