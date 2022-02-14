// Table creation model
const tableCreateQuery = {
    users: `
          CREATE TABLE IF NOT EXISTS users (
              user_id VARCHAR(50) PRIMARY KEY,
              username VARCHAR(15) UNIQUE NOT NULL,
              email VARCHAR(50) UNIQUE NOT NULL,
              dob DATE NOT NULL,
              password VARCHAR(150) NOT NULL,
              image_url VARCHAR(400) NOT NULL,
              reset_code VARCHAR(150),
              created_on DATE NOT NULL
          )
      `,
    movies: `
          CREATE TABLE IF NOT EXISTS movies (
              movie_id INT PRIMARY KEY,
              movie_title VARCHAR(150) NOT NULL,
              poster_url VARCHAR(300) NOT NULL
          )
      `,
    history: `
          CREATE TABLE IF NOT EXISTS visited_movies (
              visit_id VARCHAR(50) PRIMARY KEY,
              user_id VARCHAR(50) NOT NULL,
              movie_id INT NOT NULL,
              time_stamp TIMESTAMP NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(user_id),
              FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
          )
      `,
  };
  
  module.exports = tableCreateQuery;
  