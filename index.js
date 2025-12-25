const express = require('express')
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const port = process.env.PORT || 5000

app.use(express.json());
app.use(cors());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k6tagxb.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db('scholarStream_db');
    const ScholarshipsCollection = db.collection('scholarship');
    const UsersCollection = db.collection('Users');
    const ApplicationsCollection = db.collection('Applications');
    const ReviewsCollection = db.collection('reviews')


    app.post('/users', async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    
    
    const existingUser = await User.findOne(query);
    if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
    }
    
    const result = await User.create(user);
    res.send(result);
});

app.get('/users/role/:email', async (req, res) => {
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    
    if (user) {
        res.send({ role: user.role });
    } else {
        res.status(404).send({ message: 'User not found' });
    }
});
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email; 
    const user = await User.findOne({ email: email });
    const isAdmin = user?.role === 'Admin';
    
    if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access' });
    }
    next();
};


  




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('ScholarStream')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
