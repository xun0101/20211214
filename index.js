import express from 'express'
import mongoose from 'mongoose'
import 'dotenv/config'
import cors from 'cors'
import users from './users.js'

// 連線到資料庫
mongoose.connect(process.env.DB_URL)

// 建立 express server
const app = express()

app.use(cors({
  // origin 請求來源網址
  origin (origin, callback) {
    // callback (錯誤，是否允許)
    callback(null, true)
  }
}))

// 將 post 進來的資料處理成 json
app.use(express.json())

// app.請求方式(路徑, 處理 function)
app.post('/', async (req, res) => {
  // 檢查請求格式
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
    res.status(400).send({ sucess: false, message: '格式不符' })
    return
  }

  try {
    // 新增資料後將回傳的 document 轉為 json 物件
    const result = (await users.create(req.body)).toObject()
    // 刪除回傳的密碼欄位
    delete result.password
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    if (error.name === 'MongoServerError' && error.code === 11000) {
      // 如果資料重複
      res.status(400).send({ success: false, message: '帳號或信箱重複' })
    } else if (error.name === 'ValidationError') {
      // 如果是驗證錯誤，取第一個錯誤欄位的錯誤訊息
      const key = Object.keys(error.errors)[0]
      res.status(400).send({ success: false, message: error.errors[key].message })
    } else {
      // 未知錯誤
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
})

app.get('/', async (req, res) => {
  try {
    const query = {
      $and: []
    }

    if (req.query.agelte && !isNaN(parseInt(req.query.agelte))) {
      query.$and.push({ age: { $lte: parseInt(req.query.agelte) } })
    }
    if (req.query.agelte && !isNaN(parseInt(req.query.agegte))) {
      query.$and.push({ age: { $gte: parseInt(req.query.agegte) } })
    }

    // $and查詢時不能空白，所以如沒有搜尋就刪掉
    if (query.$and.length === 0) {
      delete query.$and
    }

    const result = await users.find(query, '-password')
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
})

app.patch('/:id', async (req, res) => {
  // 檢查請求格式
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
    res.status(400).send({ sucess: false, message: '格式不符' })
    return
  }

  try {
    // .findByIdAndUpdate(_id, {欄位: 值}, 選項)
    const result = await users.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (result) {
      res.status(200).send({ success: true, message: '', result })
    } else {
      res.status(404).send({ success: false, message: '查無帳號' })
    }
  } catch (error) {
    console.log(error)
    if (error.name === 'CastError') {
      res.status(404).send({ success: false, message: '查無帳號' })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      // 如果資料重複
      res.status(400).send({ success: false, message: '帳號或信箱重複' })
    } else if (error.name === 'ValidationError') {
      // 如果是驗證錯誤，取第一個錯誤欄位的錯誤訊息
      const key = Object.keys(error.errors)[0]
      res.status(400).send({ success: false, message: error.errors[key].message })
    } else {
      // 未知錯誤
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
})

app.delete('/:id', async (req, res) => {
  try {
    const result = await users.findByIdAndDelete(req.params.id)
    if (result) {
      res.status(200).send({ success: true, message: '', result })
    } else {
      res.status(404).send({ success: false, message: '查無帳號' })
    }
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(404).send({ success: false, message: '查無帳號' })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log('Server Started')
})
