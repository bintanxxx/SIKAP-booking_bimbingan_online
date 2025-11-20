export const validate = (schema) => (req, res, next) => {
  try {
    // Parse request body/query/params pake schema Zod
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next(); // Kalo lolos, lanjut
  } catch (error) {
    next(error); // Kalo gagal, lempar ke Global Error Handler
  }
};