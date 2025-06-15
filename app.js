const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')

//! No necesitamos jwt ni getTokenFrom aquí si solo se usan en el controlador

const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const blogsRouter = require('./controllers/blogs')

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


// Middlewares estándar
app.use(cors())
app.use(express.json())


// Middleware para extraer el token
app.use(middleware.tokenExtractor)


//! --- Rutas de la API (Montaje de routers) ---

app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/blogs', middleware.userExtractor, blogsRouter) // userExtractor solo para /api/blogs


//! --- Middlewares de Manejo de Errores ---
// Importante: Estos middlewares deben ir DESPUÉS de todas las rutas,
// ya que Express los procesa en orden.

// Middleware para manejar solicitudes a endpoints desconocidos (404 Not Found)
app.use(middleware.unknownEndpoint)

// Middleware centralizado para el manejo de errores (ValidationError, CastError, etc.)
app.use(middleware.errorHandler)


module.exports = app