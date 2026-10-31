import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);


import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDB()

.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`Server is running at port : ${process.env.PORT}`);
  })

})
.catch((err) =>{
  console.log("MONGODB CONNECTION IS FAILED ",err)

})