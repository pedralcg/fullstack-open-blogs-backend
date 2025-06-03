const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  // Si la lista de blogs está vacía, la suma de likes es 0.
  if (blogs.length === 0) {
    return 0
  }

  // Usa el método reduce para sumar los likes de cada blog.
  const sum = blogs.reduce((total, blog) => total + blog.likes, 0)
  return sum
}

module.exports = {
  dummy,
  totalLikes
}