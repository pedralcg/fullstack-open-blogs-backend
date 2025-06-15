const logger = require('./logger') // Importa tu logger para mostrar errores


// Middleware para extraer el token del encabezado Authorization
const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '') // Asigna el token a request.token
  } else {
    request.token = null // Si no hay token Bearer, asigna null
  }
  next() // Pasa el control al siguiente middleware/ruta
}


// Middleware para manejar errores de solicitudes desconocidas
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}


// Middleware para manejar errores.
// Tiene 4 parámetros: error, request, response, next.
const errorHandler = (error, request, response, next) => {
  // Loguea el mensaje de error para depuración
  logger.error(error.message)

  // Maneja errores de validación de Mongoose (como 'required' o 'minlength' de username)
  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }

  // Manejo específico para errores de CastError
  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'malformed id' })
  } 
  
  // Maneja errores de clave duplicada de MongoDB (para 'username: unique')
  else if (error.code === 11000 && error.name === 'MongoServerError') {
    return response.status(400).json({ error: 'expected `username` to be unique' })
  } 
  
  // Token no valido
  else if (error.name === 'JsonWebTokenError') {
    return response.status(401).json({ error: 'token invalid' })
  }

  // Para otros tipos de errores, pasa el control al siguiente middleware
  // (o al manejador de errores predeterminado de Express si no hay más)
  next(error)
}

module.exports = {
  tokenExtractor,
  unknownEndpoint,
  errorHandler
}