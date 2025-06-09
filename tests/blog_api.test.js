
const { test, after, beforeEach } = require('node:test') // Importa ganchos de prueba
const assert = require('node:assert') // Importa la librería de aserciones
const supertest = require('supertest') // Importa SuperTest
const mongoose = require('mongoose') // Importa Mongoose para cerrar la conexión

const helper = require('./test_helper') // Importa tus funciones auxiliares de prueba
const app = require('../app') // Importa tu aplicación Express

// Envuelve tu aplicación Express con SuperTest para poder hacer peticiones simuladas
const api = supertest(app)

//! Configuración antes de CADA prueba
beforeEach(async () => {
  // Obtén el modelo 'Blog' de la instancia global de Mongoose (ya registrada por app.js)
  const Blog = mongoose.model('Blog') // Obtiene el modelo Blog de Mongoose aquí
  await Blog.deleteMany({}) // Limpia la colección de blogs antes de cada test
  console.log('--- cleared blogs collection for test ---')

  // Inserta los blogs iniciales definidos en test_helper.js en la DB de prueba
  await Blog.insertMany(helper.initialBlogs)
  console.log('--- inserted initial blogs for test ---')
})

//* Prueba 4.8: GET /api/blogs
test('blogs are returned as json and have the correct amount', async () => {
  const response = await api
    .get('/api/blogs') // Realiza una petición GET a la API de blogs
    .expect(200) // Espera un código de estado HTTP 200 OK
    .expect('Content-Type', /application\/json/) // Espera que el Content-Type sea JSON

  // Verifica que el número de blogs devueltos sea igual al número de blogs iniciales que insertamos
  assert.strictEqual(response.body.length, helper.initialBlogs.length)

  console.log('--- blogs GET test passed ---')
})

//* Prueba 4.9: Verificar la propiedad 'id'
test('all blogs have a unique identifier named id', async () => {
  const response = await api.get('/api/blogs') // Obtiene todos los blogs

  response.body.forEach(blog => {
      // Comprueba que 'id' existe y es truthy
    assert.ok(blog.id, 'Blog object should have an id property')
    // Comprueba que '_id' no existe
    assert.strictEqual(blog._id, undefined, 'Blog object should NOT have an _id property')
  })

  console.log('--- blogs id property test passed ---') // Log para depuración
})


//* Prueba 4.10: POST /api/blogs - Crear un blog válido
test('a valid blog can be added ', async () => {
  const newBlog = { // Define un nuevo objeto de blog para enviar
    title: 'Async/Await in Express Testing',
    author: 'Refactor Master',
    url: 'http://example.com/async-express-testing',
    likes: 100
  }

  // Realiza una petición POST
  await api
    .post('/api/blogs') // Endpoint para crear blogs
    .send(newBlog)      // Envía el nuevo objeto de blog en el cuerpo de la solicitud
    .expect(201)        // Espera un código de estado 201 CREATED (creación exitosa)
    .expect('Content-Type', /application\/json/) // Espera que la respuesta sea JSON

  // Después de la operación POST, obtén el estado actual de los blogs en la DB
  const blogsAtEnd = await helper.blogsInDb()

  // Verifica que el número total de blogs ha aumentado en uno
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

  // Verifica que el contenido del nuevo blog esté presente en la lista de blogs
  const titles = blogsAtEnd.map(b => b.title) // Extrae todos los títulos de los blogs
  assert(titles.includes(newBlog.title)) // Comprueba si el título del nuevo blog está en la lista

  console.log('--- valid blog added test passed ---') // Log para depuración
})


//* Prueba 4.11: Verificar likes por defecto
test('blog without likes property defaults to 0 likes', async () => {
  const newBlog = { // Define un nuevo objeto de blog sin la propiedad 'likes'
    title: 'Blog without likes field',
    author: 'Default Likes Author',
    url: 'http://example.com/no-likes-blog'
    // 'likes' no está aquí
  }

  // Realiza una petición POST
  const response = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201) // Espera un código de estado 201 CREATED
    .expect('Content-Type', /application\/json/)

  // Verifica que el blog devuelto en la respuesta tenga 0 likes
  assert.strictEqual(response.body.likes, 0, 'Returned blog should have 0 likes')

  // Opcional: También puedes verificar el estado de la base de datos
  const blogsAtEnd = await helper.blogsInDb()
  const savedBlog = blogsAtEnd.find(blog => blog.title === newBlog.title)
  assert.strictEqual(savedBlog.likes, 0, 'Saved blog in DB should have 0 likes')

  console.log('--- blog without likes test passed ---') // Log para depuración
})


//* Prueba 4.12a: POST /api/blogs - Blog sin título
test('blog without title is not added and returns 400 Bad Request', async () => {
  const newBlog = { // Blog sin 'title'
    author: 'Missing Title Author',
    url: 'http://example.com/no-title-blog',
    likes: 5
  }

  // Realiza una petición POST
  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400) // <--- Espera un código de estado 400 Bad Request

  // Verifica que el número total de blogs no haya cambiado
  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

  console.log('--- blog without title test passed ---') // Log para depuración
})

//* Prueba 4.12b: POST /api/blogs - Blog sin URL
test('blog without url is not added and returns 400 Bad Request', async () => {
  const newBlog = { // Blog sin 'url'
    title: 'Blog without URL field',
    author: 'Missing URL Author',
    likes: 8
    // 'url' no está aquí
  }

  // Realiza una petición POST
  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(400) // <--- Espera un código de estado 400 Bad Request

  // Verifica que el número total de blogs no haya cambiado
  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

  console.log('--- blog without url test passed ---') // Log para depuración
})


//* Prueba 4.13: DELETE /api/blogs/:id
test('a blog can be deleted', async () => {
  // 1. Obtener todos los blogs para tener uno para eliminar
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0] // Selecciona el primer blog para eliminar

  // 2. Realizar la solicitud DELETE
  await api
    .delete(`/api/blogs/${blogToDelete.id}`) // Usa el ID del blog seleccionado
    .expect(204) // Espera un código de estado 204 No Content (eliminación exitosa)

  // 3. Verificar el estado de la base de datos después de la eliminación
  const blogsAtEnd = await helper.blogsInDb()

  // Verificar que el número de blogs ha disminuido en uno
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

  // Verificar que el blog eliminado ya no está en la lista de blogs
  const titles = blogsAtEnd.map(b => b.title)
  assert(!titles.includes(blogToDelete.title)) // Comprueba que el título NO está presente

  console.log('--- blog deletion test passed ---') // Log para depuración
})


//* Prueba 4.14a: PUT /api/blogs/:id - Actualización exitosa
test('a blog can be updated (likes count)', async () => {
  // 1. Obtener todos los blogs para seleccionar uno para actualizar
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0] // Selecciona el primer blog
  const originalLikes = blogToUpdate.likes

  // 2. Definir los datos de actualización (solo likes en este caso)
  const updatedData = {
    ...blogToUpdate, // Mantén todas las propiedades existentes
    likes: originalLikes + 10 // Incrementa los likes
  }

  // 3. Realizar la solicitud PUT
  const response = await api
    .put(`/api/blogs/${blogToUpdate.id}`) // PUT al ID específico
    .send(updatedData) // Envía el objeto con los likes actualizados
    .expect(200) // Espera un código de estado 200 OK
    .expect('Content-Type', /application\/json/) // Espera que la respuesta sea JSON

  // 4. Verificar que el blog devuelto en la respuesta tiene los likes actualizados
  assert.strictEqual(response.body.likes, updatedData.likes, 'Returned blog should have updated likes')

  // 5. Verificar el estado de la base de datos después de la actualización
  const blogsAtEnd = await helper.blogsInDb()
  const updatedBlogInDb = blogsAtEnd.find(blog => blog.id === blogToUpdate.id)
  assert.strictEqual(updatedBlogInDb.likes, updatedData.likes, 'Blog in DB should have updated likes')

  console.log('--- blog update (likes) test passed ---')
})

//* Prueba 4.14b: PUT /api/blogs/:id - Actualizar un blog inexistente (404)
test('updating a non-existent blog returns 404 Not Found', async () => {
  const nonExistentId = await helper.nonExistingId() // Obtiene un ID que no existe
  const updateData = {
    title: 'Non-existent blog title',
    author: 'Unknown',
    url: 'http://example.com/non-existent',
    likes: 1000
  }

  // Realiza la solicitud PUT a un ID que no existe
  await api
    .put(`/api/blogs/${nonExistentId}`)
    .send(updateData)
    .expect(404) // Espera un código de estado 404 Not Found

  // Verifica que el número de blogs en la base de datos no ha cambiado
  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

  console.log('--- update non-existent blog test passed ---')
})

//* Prueba 4.14c: PUT /api/blogs/:id - ID mal formado (400 Bad Request)
test('updating with malformed id returns 400 Bad Request', async () => {
  const malformedId = 'invalidid123' // Un ID que no tiene el formato correcto de MongoDB ObjectId
  const updateData = {
    title: 'Malformed ID test',
    author: 'Invalid Test',
    url: 'http://invalid.com',
    likes: 1
  }

  await api
    .put(`/api/blogs/${malformedId}`)
    .send(updateData)
    .expect(400) // Espera un código de estado 400 Bad Request

  // Verifica que el número de blogs en la base de datos no ha cambiado
  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)

  console.log('--- update with malformed id test passed ---')
})


//! Configuración después de TODAS las pruebas
after(async () => {
  await mongoose.connection.close() // Cierra la conexión de Mongoose después de todas las pruebas
  console.log('--- mongoose connection closed after tests ---') // Log para depuración
})