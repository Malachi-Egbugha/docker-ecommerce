const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 7072;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Product= require("./model/Product");
const isAuthenticated = require("./middleware/isAuthenticated")
app.use(express.json());
app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-with, Content-Type, Accept, Authorization");
    if(req.method === 'OPTIONS'){
        res.header('Access-Control-Allow-Methods', 'PUT,POST,PATCH,DELETE');
        return res.status(200).json({})
    }
    next();

})
var order;
var channel, connection;
mongoose.connect("mongodb://mongo_db:27017/product-service",{
    useNewUrlParser: true ,
    useUnifiedTopology: true
},()=>{
    console.log(`Product-Service DB Connected`);
});

async function connect(){
    //const amqpServer = "amqp://localhost:5672";
    try{
    const amqpServer = "amqp://rabbitmq:5672"
    connection = await amqp.connect(amqpServer);
    console.log("Connected to Rabbitmq");
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
    }
    catch(err){
        console.log(err);
    }

}

connect();


//Create  new product
//Buy a roduct
app.post("/product/create", async (req,res)=>{
    //req.user.email
    const {name, description, price} = req.body;
    const newProduct = new Product({name,description,price});
    newProduct.save();
    return res.json(newProduct);
});
//User sends a  list of product's IDS to buy
//Creating an order with those products and a total value of sum of product's prices

app.post("/product/buy",  async (req,res)=>{
    const {ids} = req.body;
    const products = await Product.find({_id: {$in : ids}});
    channel.sendToQueue("ORDER", Buffer.from(JSON.stringify({
        products,
        userEmail: req.user.email,

    })
    ));
    await channel.consume("PRODUCT", data =>{
        order = JSON.parse(data.content);
        channel.ack(data);
    });
    return res.json(order);

})

 
 app.listen(PORT, ()=>{
     console.log(`Product-Service at ${PORT}`);
 });