const router = require("express").Router();
const moviesController = require("../controllers/movies");
const isAuth = require("../middleware/auth");

// GET /movies/search
router.post("/search", moviesController.searchMovies);

// GET /movies/home
router.get("/home", moviesController.getHomePageMovies);

// GET /movies/movie/:movieId
router.get("/movie/:movieId", moviesController.getMovie);

// GET /movies/recommended
router.get("/recommended", isAuth, moviesController.getRecommended)

// GET /movies/history
router.get("/history", isAuth, moviesController.getMovieHistory);

// PUT /movies/history
router.post("/history", isAuth, moviesController.updateHistoryHandler)

module.exports = router;
