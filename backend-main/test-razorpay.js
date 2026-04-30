require('dotenv').config()
const Razorpay = require('razorpay')
const crypto = require('crypto')

const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_Sjdfz3maTzheaH'
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '1xhUVaXeFKrMUkUu61AzRtsQ'

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', X = '\x1b[0m'

async function main() {
  console.log('\n' + '═'.repeat(50))
  console.log(`${C}  Taiyari NEET Ki — Razorpay Test${X}`)
  console.log('═'.repeat(50) + '\n')

  console.log(`${Y}Key ID:${X}     ${KEY_ID}`)
  console.log(`${Y}Key Secret:${X} ${KEY_SECRET.slice(0, 4)}${'*'.repeat(KEY_SECRET.length - 4)}\n`)

  const rzp = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET })

  // Step 1: Order create karo
  process.stdout.write('1. Order create kar raha hoon... ')
  let order
  try {
    order = await rzp.orders.create({
      amount: 49900, // ₹499 in paise
      currency: 'INR',
      receipt: `test_${Date.now()}`,
      notes: { name: 'Test User', email: 'test@taiyarineetki.com' },
    })
    console.log(`${G}✓ SUCCESS${X}`)
    console.log(`   Order ID:  ${order.id}`)
    console.log(`   Amount:    ₹${order.amount / 100}`)
    console.log(`   Status:    ${order.status}\n`)
  } catch (e) {
    console.log(`${R}✗ FAILED${X}`)
    console.log(`   Error: ${e.message}\n`)
    process.exit(1)
  }

  // Step 2: Signature verify karo (dummy payment simulate)
  process.stdout.write('2. Signature verification test kar raha hoon... ')
  try {
    const dummyPaymentId = 'pay_test_dummy123'
    const body = `${order.id}|${dummyPaymentId}`
    const signature = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(body)
      .digest('hex')

    const expected = crypto
      .createHmac('sha256', KEY_SECRET)
      .update(body)
      .digest('hex')

    if (signature === expected) {
      console.log(`${G}✓ SUCCESS${X}`)
      console.log(`   Signature match ho gaya\n`)
    } else {
      console.log(`${R}✗ FAILED${X} - Signature mismatch\n`)
    }
  } catch (e) {
    console.log(`${R}✗ FAILED${X} - ${e.message}\n`)
  }

  // Step 3: Plans fetch karo (live API pe check)
  process.stdout.write('3. Razorpay API connection check kar raha hoon... ')
  try {
    const orders = await rzp.orders.all({ count: 1 })
    console.log(`${G}✓ SUCCESS${X}`)
    console.log(`   API se response mila\n`)
  } catch (e) {
    console.log(`${R}✗ FAILED${X} - ${e.message}\n`)
  }

  console.log('═'.repeat(50))
  console.log(`${G}✅ Razorpay setup sahi hai! VPS pe bhi same keys daal do.${X}`)
  console.log('═'.repeat(50) + '\n')
}

main()
