const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const yup = require('yup');
const monk = require('monk');
const { nanoid } = require('nanoid');

require('dotenv').config();

const db = monk(process.env.MONGO_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express();

app.use(helmet());
app.use(morgan('tiny'));
app.use(cors());
app.use(express.json())


app.get('/', (req, res) => {
    res.json({
        message: 'Welcome'
    });
})

app.get('/:id', async (req, res) => {
    const { id: slug } = req.params;

    try {
        const url = await urls.findOne({ slug });

        if (url) {
            const newCount = url.count + 1;
            await urls.update({ _id: url._id }, { $set: { count: newCount } });
            return res.redirect(url.url);
        } else {
            return res.status(404).send();
        }
    } catch (error) {
        return res.status(404).send();
    }
})

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required(),
    count: yup.number(),
})

app.post('/url', async (req, res, next) => {
    let { slug, url } = req.body;
    try {
        await schema.validate({
            slug,
            url,
        })
        if (!slug) {
            slug = nanoid(10);
        } else {
            const existing = await urls.findOne({ slug })
            if (existing) {
                throw new Error("Slug in use! Try another");
            }
        }
        slug = slug.toLowerCase();
        let count = 0;
        const newUrl = {
            slug,
            url,
            count,
        }
        const created = await urls.insert(newUrl);
        res.json(created);
    } catch (error) {
        next(error);
    }

})

app.use((error, req, res, next) => {
    if (error.status) {
        res.status(error.status);
    } else {
        res.status(500);
    }
    res.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
    });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
})
