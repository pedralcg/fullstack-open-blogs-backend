const logger = require('./logger') // Importa tu logger para mostrar errores
const jwt = require('jsonwebtoken')
const User = require('../models/user') 


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


// Middleware userExtractor
const userExtractor = async (request, response, next) => {
  // Asume que tokenExtractor ya ha puesto el token en request.token
  const token = request.token;

  if (!token) {
    // Si no hay token, no podemos extraer el usuario. Pasa el control.
    // Las rutas posteriores deberán manejar el 401 si requieren autenticación.
    request.user = null; // Para claridad, asigna null
    return next();
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET);

    if (!decodedToken.id) {
      // Si el token es inválido o no tiene ID, no se puede extraer el usuario.
      request.user = null; // Asigna null
      return next();
    }

    // Encuentra al usuario y lo guarda en request.user
    request.user = await User.findById(decodedToken.id);
    next(); // Pasa el control al siguiente middleware/ruta
  } catch (error) {
    // Captura errores de jwt.verify (JsonWebTokenError, TokenExpiredError)
    // y de búsqueda de usuario (si fuera el caso).
    // Pasa el error al errorHandler.
    next(error);
  }
};


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
  userExtractor,
  unknownEndpoint,
  errorHandler
}