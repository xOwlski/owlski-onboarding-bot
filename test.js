const config = require('./config.json');
const { TwitterApi } = require('twitter-api-v2');

(async () => {
    // Instantiate with desired auth type (here's Bearer v2 auth)
    const twitterClient = new TwitterApi({
        appKey: config.twitterApiKey,
        appSecret: config.twitterApiSecret
    });

    // Tell typescript it's a readonly app
    const roClient = twitterClient.readOnly;

    roClient.appLogin().then(async (api) => {

        // Play with the built in methods
        const user = await api.v2.followers('1311173419732475906');
        console.log(user)
    })


})();
