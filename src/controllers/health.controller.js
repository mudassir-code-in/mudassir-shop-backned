

export function testHealth(req, res) {
    res.status(200).json({
        success: true,
        message: 'server active'
    })
}