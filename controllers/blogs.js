const blogsRouter = require('express').Router()
const Blog = require('../models/blog') // <--- ¡Importa el modelo Blog!
const User = require('../models/user') // <--- ¡Importa el modelo User!
const jwt = require('jsonwebtoken') // <--- ¡Importa jwt!


// --- Ruta GET /api/blogs - Obtener todos los blogs ---
blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
  response.json(blogs)
})

// --- Ruta POST /api/blogs - Crear un nuevo blog ( PROTEGIDA POR TOKEN) ---
blogsRouter.post('/', async (request, response, next) => {
  const body = request.body
  const user = request.user // Obtiene el usuario directamente

  try {
    // Ya no verificamos el token ni buscamos al usuario aquí,
    // eso lo hace userExtractor. Solo comprobamos si request.user existe.
    if (!user || !user.id) { // userExtractor asigna null si no hay token o es inválido
      return response.status(401).json({ error: 'token invalid or missing' })
    }

    const blog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes || 0,
      user: user._id // Asigna el blog al usuario obtenido del middleware
    })

    const savedBlog = await blog.save()

    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()

    const populatedBlog = await savedBlog.populate('user', { username: 1, name: 1 })
    response.status(201).json(populatedBlog)

  } catch (error) {
    // Los errores de JWT (JsonWebTokenError, TokenExpiredError) serán manejados por errorHandler
    next(error)
  }
})

// --- Ruta DELETE /api/blogs/:id - Eliminar un blog (PROTEGIDA Y AUTORIZADA) ---
blogsRouter.delete('/:id', async (request, response, next) => {
  const blogId = request.params.id
  const user = request.user // Obtiene el usuario directamente

  try {
    // Verificación de autenticación:
    // userExtractor ya procesó el token. Si request.user es null, significa que el token era inválido o faltaba.
    if (!user || !user.id) {
      return response.status(401).json({ error: 'token invalid or missing' })
    }

    const blogToDelete = await Blog.findById(blogId)

    if (!blogToDelete) {
      return response.status(204).end()
    }

    // Verificación de autorización: ¿El usuario es el creador del blog?
    // Compara el ID del usuario del middleware con el ID del creador del blog.
    if (blogToDelete.user.toString() !== user.id.toString()) {
      return response.status(403).json({ error: 'user not authorized to delete this blog' })
    }

    await Blog.findByIdAndDelete(blogId)

    // Eliminar la referencia del blog del array de blogs del usuario
    // No necesitamos volver a buscar al usuario si ya lo tenemos de request.user
    if (user) { // Este 'if' es una doble seguridad, request.user ya debería ser un objeto aquí
      user.blogs = user.blogs.filter(blogRef => blogRef.toString() !== blogId.toString())
      await user.save()
    }

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
    user: body.user // Asegúrate de que el frontend envíe solo el ID del usuario aquí
  }

  try {
  // Asegúrate de poblar el campo 'user' si quieres que la respuesta del PUT también lo tenga
  const updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true, runValidators: true, context: 'query' })
    .populate('user', { username: 1, name: 1 }) // <-- Opcional pero recomendado para consistencia con GET/POST

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