const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Document Approval Server is running on port ${PORT}`);
  console.log(`Frontend CORS origin set to: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
