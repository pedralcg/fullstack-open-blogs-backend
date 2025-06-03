const { test, describe } = require('node:test')
const assert = require('node:assert')
const listHelper = require('../utils/list_helper')

// DATOS DE PRUEBA COMPARTIDOS
const listWithOneBlog = [
  {
    _id: '5a422aa71b54a676234d17f8',
    title: 'Go To Statement Considered Harmful',
    author: 'Edsger W. Dijkstra',
    url: 'https://homepages.cwi.nl/~storm/teaching/reader/Dijkstra68.pdf',
    likes: 5,
    __v: 0
  }
]

const emptyList = []

const blogs = [
  {
    _id: "5a422a851b54a676234d17f7",
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7,
    __v: 0
  },
  {
    _id: "5a422aa71b54a676234d17f8",
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    likes: 5,
    __v: 0
  },
  {
    _id: "5a422b3a1b54a676234d17f9",
    title: "Canonical string reduction",
    author: "Edsger W. Dijkstra",
    url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
    likes: 12,
    __v: 0
  },
  {
    _id: "5a422b891b54a676234d17fa",
    title: "First class tests",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.htmll",
    likes: 10,
    __v: 0
  },
  {
    _id: "5a422ba71b54a676234d17fb",
    title: "TDD harms architecture",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html",
    likes: 0,
    __v: 0
  },
  {
    _id: "5a422bc61b54a676234d17fc",
    title: "Type wars",
    author: "Robert C. Martin",
    url: "http://blog.cleancoder.com/uncle-bob/2016/05/01/TypeWars.html",
    likes: 2,
    __v: 0
  }
]


// Bloque de pruebas para la función dummy
describe('list helper', () => {
  test('dummy returns one', () => {
    // Este `blogs` vacío es específico para este test, no es el mismo que el global
    const blogs = []
    const result = listHelper.dummy(blogs)
    assert.strictEqual(result, 1)
  })
})


// Bloque de pruebas para totalLikes
describe('total likes', () => {

  // Caso de prueba 1: Lista con un solo blog (usa el global)
  test('when list has only one blog, equals the likes of that', () => {
    const result = listHelper.totalLikes(listWithOneBlog)
    assert.strictEqual(result, 5)
  })

  // Caso de prueba 2: Lista vacía (usa el global)
  test('of empty list is zero', () => {
    const result = listHelper.totalLikes(emptyList)
    assert.strictEqual(result, 0)
  })

  // Caso de prueba 3: Lista con varios blogs (usa el global)
  test('of a bigger list is calculated right', () => {
    const result = listHelper.totalLikes(blogs)
    assert.strictEqual(result, 36)
  })
})


// Bloque de pruebas para favoriteBlog
describe('favorite blog', () => {

  // Caso de prueba 1: Lista con un solo blog (usa el global)
  test('when list has only one blog, returns that blog', () => {
    const result = listHelper.favoriteBlog(listWithOneBlog)
    assert.deepStrictEqual(result, {
      title: 'Go To Statement Considered Harmful',
      author: 'Edsger W. Dijkstra',
      likes: 5
    })
  })

  // Caso de prueba 2: Lista vacía (usa el global)
  test('of empty list is null', () => {
    const result = listHelper.favoriteBlog(emptyList)
    assert.strictEqual(result, null)
  })

  // Caso de prueba 3: Lista con varios blogs (usa el global)
  test('of a bigger list is chosen right', () => {
    const result = listHelper.favoriteBlog(blogs)
    assert.deepStrictEqual(result, {
      title: "Canonical string reduction",
      author: "Edsger W. Dijkstra",
      likes: 12
    })
  })
})


// Bloque de pruebas para mostBlogs
describe('most blogs', () => {

  // Caso de prueba: lista grande (usa el global 'blogs')
  test('of a bigger list returns the author with most blogs', () => {
    const result = listHelper.mostBlogs(blogs)
    assert.deepStrictEqual(result, {
      author: "Robert C. Martin",
      blogs: 3
    })
  })

  // Caso de prueba: lista vacía (usa el global 'emptyList')
  test('of empty list is null', () => {
    const result = listHelper.mostBlogs(emptyList)
    assert.strictEqual(result, null)
  })

  // Caso de prueba: lista con un solo blog (usa el global 'listWithOneBlog')
  test('when list has only one blog, returns that author', () => {
    const result = listHelper.mostBlogs(listWithOneBlog)
    assert.deepStrictEqual(result, {
      author: "Edsger W. Dijkstra",
      blogs: 1
    })
  })

  // Caso de prueba: autores con la misma cantidad de blogs (empate)
  // Este array es específico de este test, por eso se mantiene local
  const blogsWithTie = [
    { title: "Blog A", author: "Author X", likes: 1 },
    { title: "Blog B", author: "Author Y", likes: 2 },
    { title: "Blog C", author: "Author X", likes: 3 },
    { title: "Blog D", author: "Author Y", likes: 4 }
  ]
  test('when there is a tie, returns one of the top authors', () => {
    const result = listHelper.mostBlogs(blogsWithTie)
    const expectedResults = [
      { author: "Author X", blogs: 2 },
      { author: "Author Y", blogs: 2 }
    ]
    // assert.ok verifica que la condición sea verdadera.
    // .some() verifica si AL MENOS UNO de los resultados esperados coincide.
    assert.ok(expectedResults.some(expected =>
      expected.author === result.author && expected.blogs === result.blogs
    ))
  })
})