
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


//! Configuración después de TODAS las pruebas
after(async () => {
  await mongoose.connection.close() // Cierra la conexión de Mongoose después de todas las pruebas
  console.log('--- mongoose connection closed after tests ---') // Log para depuración
})