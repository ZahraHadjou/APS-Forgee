let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, PORT } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}
APS_BUCKET = 'azerty18029511';
PORT = PORT || 8080;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
    PORT
};