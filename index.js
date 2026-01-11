const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true,
    optionSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k6tagxb.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
};

async function run() {
    try {
        const db = client.db('scholarStream_db');
        const ScholarshipsCollection = db.collection('scholarship');
        const UsersCollection = db.collection('Users');
        const ApplicationsCollection = db.collection('Applications');

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            const isAdmin = user?.role === 'Admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };

        
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100); 

            if (!price || amount < 1) return res.send({ clientSecret: null });

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

    
        app.post('/applications', verifyToken, async (req, res) => {
            const applicationData = req.body;
            const result = await ApplicationsCollection.insertOne(applicationData);
            res.send(result);
        });

    
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
            res.send({ token });
        });

        app.get('/scholarships', async (req, res) => {
            const { search, category } = req.query;
            let query = {};
            if (search) query.scholarshipName = { $regex: search, $options: 'i' };
            if (category) query.subjectCategory = category;
            const result = await ScholarshipsCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        });

        app.post('/scholarships', verifyToken, verifyAdmin, async (req, res) => {
            const scholarshipData = req.body;
            const result = await ScholarshipsCollection.insertOne(scholarshipData);
            res.send(result);
        });

        app.get('/scholarships/:id', async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({ message: 'Invalid Object ID' });
                }
                const query = { _id: new ObjectId(id) };
                const result = await ScholarshipsCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ message: 'Scholarship not found' });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Server error', error });
            }
        });

        app.delete('/scholarships/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }; 
            const result = await ScholarshipsCollection.deleteOne(query); 
            res.send(result);
        });

        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const user = await UsersCollection.findOne({ email });
            res.send({ role: user?.role || 'Student' });
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await UsersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }
            const result = await UsersCollection.insertOne({
                ...user,
                role: user.role || 'Student',
            });
            res.send(result);
        });

        console.log('Successfully connected to MongoDB!');
    } finally { }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('ScholarStream Server is Running'));
app.listen(port, () => console.log(`Server listening on port ${port}`));