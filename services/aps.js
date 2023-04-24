//This is where we will be implementing all the APS logic that will be used in different areas of our server application. 
const fs = require('fs');
const APS = require('forge-apis');
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET } = require('../config.js');

let internalAuthClient = new APS.AuthClientTwoLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, ['bucket:read', 'bucket:create', 'data:read', 'data:write', 'data:create'], true);
let publicAuthClient = new APS.AuthClientTwoLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, ['viewables:read'], true);

const service = module.exports = {};

service.getInternalToken = async () => {
    if (!internalAuthClient.isAuthorized()) {
        await internalAuthClient.authenticate();
    }
    return internalAuthClient.getCredentials();
};

service.getPublicToken = async () => {
    if (!publicAuthClient.isAuthorized()) {
        await publicAuthClient.authenticate();
    }
    return publicAuthClient.getCredentials();
};

// try and retrieve additional details about the bucket --> no response display 404 not found --> and then create a bucket with this name 
service.ensureBucketExists = async (bucketKey) => {
    try {
        await new APS.BucketsApi().getBucketDetails(bucketKey, null, await service.getInternalToken());
    } catch (err) {

        console.log("err.response.status") ; 
        console.log(err.response.status) ; 
        if (err.response.status === 404) {
            try {
            await new APS.BucketsApi().createBucket({ bucketKey, policyKey: 'persistent' }, {}, null, await service.getInternalToken());
            }
            catch(error){
                console.log("error")
                console.log(error.response.status) ;
            }
        } else {
            throw err;
        }
    }
};


service.listObjects = async () => {
    console.log("test0");
    await service.ensureBucketExists(APS_BUCKET);
    console.log("test1");
    let resp = await new APS.ObjectsApi().getObjects(APS_BUCKET, { limit: 64 }, null, await service.getInternalToken());
    let objects = resp.body.items;
    while (resp.body.next) {
        const startAt = new URL(resp.body.next).searchParams.get('startAt');
        resp = await new APS.ObjectsApi().getObjects(APS_BUCKET, { limit: 64, startAt }, null, await service.getInternalToken());
        objects = objects.concat(resp.body.items);
    }
    return objects;
};

service.uploadObject = async (objectName, filePath) => {
    await service.ensureBucketExists(APS_BUCKET);
    const buffer = await fs.promises.readFile(filePath);
    const results = await new APS.ObjectsApi().uploadResources(
        APS_BUCKET,
        [{ objectKey: objectName, data: buffer }],
        { useAcceleration: false, minutesExpiration: 15 },
        null,
        await service.getInternalToken()
    );
    if (results[0].error) {
        throw results[0].completed;
    } else {
        return results[0].completed;
    }
};

// Derivative 
service.translateObject = async (urn, rootFilename) => {
    const job = {
        input: { urn },
        output: { formats: [{ type: 'svf', views: ['2d', '3d'] }] }
    };
    if (rootFilename) {
        job.input.compressedUrn = true;
        job.input.rootFilename = rootFilename;
    }
    const resp = await new APS.DerivativesApi().translate(job, {}, null, await service.getInternalToken());
    return resp.body;
};

service.getManifest = async (urn) => {
    try {
        const resp = await new APS.DerivativesApi().getManifest(urn, {}, null, await service.getInternalToken());
        return resp.body;
    } catch (err) {
        if (err.response.status === 404) {
            return null;
        } else {
            throw err;
        }
    }
};

service.urnify = (id) => Buffer.from(id).toString('base64').replace(/=/g, '');

