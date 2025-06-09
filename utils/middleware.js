const logger = require('./logger') // Importa tu logger para mostrar errores

// Middleware para manejar errores de solicitudes desconocidas
const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

// Middleware para manejar errores.
// Tiene 4 parámetros: error, request, response, next.
const errorHandler = (error, request, response, next) => {
  // Loguea el mensaje de error para depuración
  logger.error(error.message)

  // Manejo específico para errores de validación de Mongoose (como 'required: true')
  if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message })
  }

  // Para otros tipos de errores, pasa el control al siguiente middleware
  // (o al manejador de errores predeterminado de Express si no hay más)
  next(error)
}

module.exports = {
  unknownEndpoint,
  errorHandler
}