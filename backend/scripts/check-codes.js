(async () => {
  try {
    const { prisma } = require('../dist/config/prisma')
    const { itemService } = require('../dist/services/item.service')

    const item = await prisma.item.findFirst()
    if (!item) {
      console.log('NO_ITEMS')
      await prisma.$disconnect()
      process.exit(0)
    }

    const byQr = await itemService.getByCode(item.qrValue)
    const byBarcode = await itemService.getByCode(item.barcodeValue)

    console.log(JSON.stringify({
      itemId: item.id,
      qrValue: item.qrValue,
      barcodeValue: item.barcodeValue,
      qrLookupWorks: byQr.id === item.id,
      barcodeLookupWorks: byBarcode.id === item.id,
    }, null, 2))

    await prisma.$disconnect()
  } catch (err) {
    console.error('ERROR', err)
    try { const { prisma } = require('../dist/config/prisma'); await prisma.$disconnect() } catch {}
    process.exit(1)
  }
})()
