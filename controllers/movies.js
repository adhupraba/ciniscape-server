const { v4 } = require("uuid");
const jwt = require("jsonwebtoken");
const pgClient = require("../utils/db");
const api = require("./api");
const env = require('../utils/env')

// User authentication check
const checkUser = (req) => {
  // Getting authorization value
  const authHeader = req.get("Authorization");
  
  // Checking user is authorized
  if (authHeader) {
    // Extracting token
    const token = authHeader.split(" ")[1];
    // Decoding token
    let decodedToken = jwt.verify(token, env.secretKey);
    // Unauthorized users
    if (!decodedToken) {
      const error = new Error("Not Authenticated");
      error.statusCode = 401;
      throw error;
    }

    // Assigning user id
    return decodedToken.userId;
  }

  // if there is no user
  return undefined;
};

const histAndRecomm = async (userId) => {
  // Getting user history
  const getHistory = await pgClient.query(
    `
        SELECT * FROM movies
        INNER JOIN visited_movies ON movies.movie_id = visited_movies.movie_id
        WHERE visited_movies.user_id = $1
      `,
    [userId]
  );
  // User history data
  let viewHistory = getHistory.rows.map(ele => {
    let historyElement = {};
    historyElement.movie_id = ele.movie_id;
    historyElement.title = ele.movie_title;
    historyElement.posterPath = ele.poster_url;
    return historyElement;
  });

  // Pick a random number to choose a movie id from array of movies history
  const random = Math.floor(Math.random() * 5);
  
  let recommended = []
  // Throws error message if history is empty
  if (viewHistory.length >= 5) {
    // Getting recommendation movies
    recommended = await api.getRecommendation(
      viewHistory[random]["movie_id"]
    );
  }
  
  return { viewHistory, recommended }
}

// Search request controller
exports.searchMovies = async (req, res, next) => {
  try {
    // Getting query from request body
    const { query } = req.body;

    // Throws error if query is not present
    if (!query) {
      const error = new Error("Query is not available in request body");
      error.statusCode = 400;
      throw error;
    }

    // API call to get search result
    const searchResults = await api.searchMovies(query);

    // Response for search result
    res.status(200).json({ searchResults });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

// Home page movies request controller
exports.getHomePageMovies = async (req, res, next) => {
  try {
    // Checking whether user is authenticated or not
    const userId = checkUser(req);
    const popular = await api.mostPopularMovies();

    // Getting top rated movies
    const topRated = await api.topRatedMovies();

    // Getting latest release movies movies
    const latestRelease = await api.latestReleaseMovies();
    
    const genreMovies = await api.getAllGenreMovies()

    // Initializing 'recommended' as empty
    let recommended = [];
    
    let viewHistory = []
    
    // Checking request is authorized or not
    if (userId) {
      const hisAndRec = await histAndRecomm(userId)
      recommended = hisAndRec.recommended
      viewHistory = hisAndRec.viewHistory
    }

    const moviesCollection = {
      popular,
      topRated,
      latestRelease,
      recommended,
      viewHistory,
      genreMovies
    };

    // Response for home page
    res.status(200).json({
      message: "Successfully fetched home page data",
      moviesCollection: moviesCollection,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

/**
 *
 * @params {*} movieId
 * @returns Single movie details
 */
// Movies details request controller
exports.getMovie = async (req, res, next) => {
  try {
    // Checking whether user is authenticated or not
    req.userId = checkUser(req);

    // getting movie id from request params
    const movieId = req.params.movieId;

    // getting user id from request body
    const userId = req.userId;

    // API call for movies information
    const movie = await api.getMovieById(movieId);

    // API call for similar movies
    const similarMovies = await api.similarMovies(movieId);
    
    if (userId) {
      //       INSERT INTO users (id, level)
      // VALUES (1, 0)
      // ON CONFLICT (id) DO UPDATE
      // SET level = users.level + 1;
      // Insert movie details into movies table only if data is not already present
      const insertMovie = await pgClient.query(
        `
        INSERT INTO movies( movie_id, movie_title, poster_url )
        VALUES ($1 , $2, $3)
        ON CONFLICT (movie_id) DO NOTHING
      `,
        [movie.id, movie.title, movie.posterPath]
      );

      // Insert movie id and user id into visited_movies table for recent view history
      const insertHistory = await pgClient.query(
        `
        INSERT INTO visited_movies( visit_id, user_id, movie_id, time_stamp )
        SELECT * FROM (SELECT $1,
          (SELECT user_id FROM users WHERE user_id = $2),
          (SELECT movie_id FROM movies WHERE movie_id = CAST ($3 AS INTEGER)),
          (to_timestamp($4/ 1000.0))
        ) AS tmp
        WHERE NOT EXISTS (
          SELECT movie_id, user_id FROM visited_movies WHERE movie_id = CAST ($3 AS INTEGER) AND user_id = $2
        ) LIMIT 1
      `,
        [v4(), userId, movie.id, Date.now()]
      );
    }

    // Response for movies details
    res.status(200).json({
      message: "Fetched movie information",
      movieDetails: {
        ...movie,
        similarMovies,
      },
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

/**
 * @header {*} Authorization
 * @returns User movies history
 */
// User history request controller
exports.getMovieHistory = async (req, res, next) => {
  try {
    // Getting userid from request parameter
    const userId = req.userId;

    // Getting user history
    const getHistory = await pgClient.query(
      `
      SELECT movies.movie_id, movies.movie_title, movies.poster_url, visited_movies.time_stamp FROM movies
      INNER JOIN visited_movies ON movies.movie_id = visited_movies.movie_id
      WHERE visited_movies.user_id = $1 ORDER BY visited_movies.time_stamp DESC
    `,
      [userId]
    );

    // User history data
    const historyResult = getHistory.rows.map(ele => {
      let historyElement = {};
      historyElement.movie_id = ele.movie_id;
      historyElement.title = ele.movie_title;
      historyElement.posterPath = ele.poster_url;
      historyElement.time_stamp = ele.time_stamp;
      return historyElement;
    });

    // Response for user history
    res.status(200).json({
      message: "Fetched movies history",
      history: historyResult,
    });
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

exports.updateHistoryHandler = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { movieId } = req.body
    
    await pgClient.query(
      `
          UPDATE visited_movies
          SET time_stamp = (to_timestamp($1/ 1000.0))
          WHERE movie_id = CAST ($2 AS INTEGER) AND user_id = $3
        `,
      [Date.now(), movieId, userId]
    );
    
    res.status(200).json({ message: 'Updated history' })
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
}

exports.getRecommended = async (req, res, next) => {
  try {
    const userId = req.userId
    const { recommended } = await histAndRecomm(userId)
    
    res.status(200).json({
      message: 'Got the recommendations',
      recommended
    })
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
}
