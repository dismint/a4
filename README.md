# 6.1040 Social Media Starter Backend Code

## Getting Started

If you are using VSCode/VSCodium, install the ESLint and Prettier extensions.
The project is already configured to use ESLint and Prettier,
but feel free to add your own rules if you want.
Right now, the code is formatted on save; you can change this in `.vscode/settings.json`
by disabling `editor.formatOnSave`.

Run `npm install` to install dependencies.

## Creating MongoDB Atlas Instance
To run the server, you need to create a MongoDB Atlas instance and connect your project. Feel free to follow the instructions below or use these [slides](https://docs.google.com/presentation/d/1HJ4Lz1a2IH5oKu21fQGYgs8G2irtMqnVI9vWDheGfKM/edit?usp=sharing).
1. Create your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account.
2. When selecting a template, choose the __free__ option, M0.
4. At the Security Quickstart page, select how you want to authenticate your connection and keep the rest of the defaults. Make sure to allow access to all IPs as shown in [this slide](https://docs.google.com/presentation/d/1HJ4Lz1a2IH5oKu21fQGYgs8G2irtMqnVI9vWDheGfKM/edit#slide=id.g167b96ecbf8_0_0).
5. Once created, click the __CONNECT__ button, select __driver__, and copy the srv connection string. If using username and password, the url should look something like this: `mongodb+srv://<username>:<password>@cluster0.p82ijqd.mongodb.net/?retryWrites=true&w=majority`. Make sure to replace username and password with your actual values.
6. Now go to your project files and create a new file at the root directory called `.env` (don't forget the 'dot' at the front). Add the line (without `<` and `>`)
    ```
    MONGO_SRV=<connection url>
    ```
    to the `.env` file. 

__Congrats!__ You're ready to run locally! Don't hesitate to reach out if you run into issues. 

## Running Locally

Run `npm start` to start the server and the testing client.
If you make changes to code, you need to manually restart the server.

Run `npm run watch` to watch for changes and restart the server automatically.
Note that this is not recommended when actively developing;
use this when testing your code so your small changes get reflected in the server.

## Testing

There is a testing client under `public` directory.
Locate to `http://localhost:3000` (or a different port if you changed it) to see the testing client.
Add more operations to `public/util.ts` to test your server code.
Make sure to refresh the page after making changes to the client code.
Add some fancy CSS to make your page look nicer!

Keep in mind that we are using `MongoStore` for session management,
so your session will be persisted across server restarts.

## Deploying to Vercel

1. Create a new project on Vercel and link it to your GitHub project.
2. Under "Build & Development Settings", change "Output Directory" to `dist-server/public`.
3. Add the following environment variables to your Vercel project:
Key: `MONGO_SRV`, Value: `<your mongo connection string from .env file>`
Note: only paste the right hand value after `=` (without `<` and `>`), i.e. `MONGO_SRV=<your mongo connection string>`
4. Deploy!

## Understanding the Structure

The main entry point to the server is `api/index.ts`.
This is how the server is started and how the routes are registered.
We would usually put this file under `server/`,
but Vercel requires the entry point to be under `api/` directory.

The code for the server is under `server/` directory,
which includes both concept and RESTful API implementations.

Here's an overview of the files and directories.
First, concept implementations:
- `server/concepts` contains the concept implementations.
Note that we try to keep concepts as modular and generic as possible.
- `server/concepts/errors.ts` contains the base error classes you can
either directly use or extend from. You are free to add more base errors
in that file if you need to
(e.g., if your route needs to return [I am a teapot](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/418) error).

Framework code:

- `framework/router.ts` contains the framework code that does the magic to convert your
route implementations and error handling into Express handlers.
Editing this file is not recommended.
- `framework/doc.ts` defines a convenient wrapper around MongoDB. You may want to edit this file.

Server implementation:

- `server/app.ts` contains your app definition (i.e., concept instantiations).
- `server/db.ts` contains the MongoDB setup code. You should not need to edit this file.
- `server/routes.ts` contains the code for your API routes.
Try to keep your route definitions as simple as possible.
- `server/responses.ts` contains the code for formatting your responses and errors
into a more user-friendly format for the front-end. For example, it would be better
if your front-end receives `barish is not the author of this post` instead of
`64e52a1f5ffc7d0d48a0569d is not the author of this post`.

And tests:

- `test` contains Mocha unit tests for the server.
