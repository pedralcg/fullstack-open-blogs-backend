const blogsRouter = require('express').Router()
const Blog = require('../models/blog') // <--- ¡Importa el modelo Blog!
const User = require('../models/user') // <--- ¡Importa el modelo User!
const jwt = require('jsonwebtoken') // <--- ¡Importa jwt!

// --- Función auxiliar para extraer el token del encabezado ---
const getTokenFrom = request => {
  const authorization = request.get('authorization')
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.replace('Bearer ', '')
  }
  return null
}

// --- Ruta GET /api/blogs - Obtener todos los blogs ---
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

// --- Ruta POST /api/blogs - Crear un nuevo blog ( PROTEGIDA POR TOKEN) ---
blogsRouter.post('/', async (request, response, next) => {
  const body = request.body
  const token = getTokenFrom(request) // Extrae el token

  try {
    // 1. Verificar y decodificar el token
    const decodedToken = jwt.verify(token, process.env.SECRET)

    // 2. Si el token no tiene ID, no autorizado
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'token invalid or missing user ID' })
    }

    // 3. Buscar el usuario en la base de datos usando el ID del token decodificado
    const user = await User.findById(decodedToken.id)

    // 4. Si el usuario no existe (ej. fue borrado), no autorizado
    if (!user) {
      return response.status(401).json({ error: 'user not found' })
    }

    // 5. Crear la nueva instancia de Blog, asociándola al usuario identificado por el token
    const blog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes || 0,
      user: user._id // Asigna el blog al usuario que hizo la solicitud
    })

    // 6. Guardar el blog
    const savedBlog = await blog.save()

    // 7. Añadir el ID del nuevo blog a la lista de blogs del usuario
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save() // Guarda el usuario actualizado

    // 8. Popula el campo 'user' en el blog guardado antes de enviarlo como respuesta
    const populatedBlog = await savedBlog.populate('user', { username: 1, name: 1 })
    response.status(201).json(populatedBlog)

  } catch (error) {
    // Pasa el error al middleware de manejo de errores (manejará JsonWebTokenError, etc.)
    next(error)
  }
})

// --- Ruta DELETE /api/blogs/:id - Eliminar un blog ---
blogsRouter.delete('/:id', async (request, response, next) => {
  try {
    await Blog.findByIdAndDelete(request.params.id)
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

// --- Ruta PUT /api/blogs/:id - Actualizar un blog ---
blogsRouter.put('/:id', async (request, response, next) => {
  const body = request.body
  const id = request.params.id

  const blog = {
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
  }

  try {
    const updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true, runValidators: true, context: 'query' })

    if (updatedBlog) {
      response.json(updatedBlog)
    } else {
      response.status(404).end()
    }

  } catch (error) {
    next(error)
  }
})

module.exports = blogsRouter // Exporta el router