import dodoko from '../build'

dodoko()
    .get('/', () => 'hi')
    .get('/hi', () => 'hi')
    .get('/hi2', () => 'hi')
    .get('/h/:hi', ({ extra: { params } }) => `Hi ${params.hi}`)
    .get('/rest/*', () => 'Rest')
    .fallback(() => 'Not found')
    .listen(3000)
    .then(() => {
        console.log("Listening at :3000")
    })
