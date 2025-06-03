const _ = require('lodash')
// asignación a la variable con un nombre  específico y reconocido por la comunidad

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  if (blogs.length === 0) {
    return 0
  }
  const sum = blogs.reduce((total, blog) => total + blog.likes, 0)
  return sum
}

const favoriteBlog = (blogs) => {
  // Si la lista de blogs está vacía, no hay blog favorito.
  if (blogs.length === 0) {
    return null
  }

  let favorite = blogs[0]

  // Iteramos sobre el resto de los blogs para encontrar el que tiene más likes
  for (let i = 1; i < blogs.length; i++) {
    if (blogs[i].likes > favorite.likes) {
      favorite = blogs[i]
    }
  }

  // Creamos un nuevo objeto con las propiedades: título, autor y likes.
  return {
    title: favorite.title,
    author: favorite.author,
    likes: favorite.likes
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  // Usa _.countBy para contar los blogs por autor
  const authorCounts = _.countBy(blogs, 'author')

  // Usa _.maxBy para encontrar el autor con el mayor número de blogs
  // _.toPairs convierte el objeto authorCounts en un array de [autor, count]
  // Luego _.maxBy encuentra el par con el mayor count (el segundo elemento del par)
  const topAuthorPair = _.maxBy(_.toPairs(authorCounts), _.last)

  return {
    author: topAuthorPair[0],
    blogs: topAuthorPair[1]
  }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs
}