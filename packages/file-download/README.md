# Theia - File Download

Provides the file download contribution to the `Files` navigator.

Supports single and multi file downloads.
 - A single file will be downloaded as is.
 - Folders will be downloaded az ZIP archives.
 - When downloading multiple files, each file should be contained in the same parent folder. Otherwise, the command contribution is disabled.

### REST API

 - To download a single file or folder use the following endpoint: `GET /file-download/?uri=/encoded/file/uri/to/the/resource`.
   - Example: `curl -X GET http://localhost:3000/file-download/?uri=file:///Users/akos.kitta/git/theia/package.json`.

 - To download multiple files (from the same folder) use the `PUT /file-download/` endpoint with the `application/json` content type header and the following body format:
    ```json
    {
        "uri": [
            "/encoded/file/uri/to/the/resource",
            "/another/encoded/file/uri/to/the/resource"
        ]
    }
    ```
   ```
   curl -X PUT -H "Content-Type: application/json" -d '{ "uris": ["file:///Users/akos.kitta/git/theia/package.json", "file:///Users/akos.kitta/git/theia/README.md"] }' http://localhost:3000/file-download/
   ```

## License
[Apache-2.0](https://github.com/theia-ide/theia/blob/master/LICENSE)