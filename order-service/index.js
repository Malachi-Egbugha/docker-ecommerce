const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 9090;
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const Order= require("./model/Order");
const isAuthenticated = require("./middleware/isAuthenticated")
app.use(express.json());
var channel, connection;
mongoose.connect("mongodb://mongo_db:27017/order-service",{
    useNewUrlParser: true ,
    useUnifiedTopology: true
},()=>{
    console.log(`Order-Service DB Connected`);
})
async function connect(){
    //const amqpServer = "amqp://localhost:5672";
    //const amqpServer = "amqp://rabbitmq:5672"
    try{
    const amqpServer = "amqp://rabbitmq:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    console.log("Connect to rabbit MQ");
    await channel.assertQueue("ORDER");
    }
    catch(err){
        console.log(err);
    }

}
function createOrder(products, userEmail){
    let total = 0;
    for (let t=0; t<products.length; ++t){
        total += products[t].price;

    }
    const newOrder = new Order({
        products,
        user: userEmail,
        total_price: total

    });
    newOrder.save();
    return newOrder;
}
connect().then(()=>{
    channel.consume("ORDER", data=>{
        const {products, userEmail} = JSON.parse(data.content);
        const newOrder = createOrder(products, userEmail);
        channel.ack(data);
        channel.sendToQueue("PRODUCT", Buffer.from(JSON.stringify({newOrder})));
    });
});

 
 app.listen(PORT, ()=>{
     console.log(`Order-Service at ${PORT}`);
 });