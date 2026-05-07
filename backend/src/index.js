const app = require("./app");
app.get("/", (req, res) => {
    res.send("API is working");
});
app.listen(5000, '0.0.0.0',() => {
    console.log("Server running on 5000");
});