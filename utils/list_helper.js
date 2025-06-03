// utils/list_helper.js

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

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog
}