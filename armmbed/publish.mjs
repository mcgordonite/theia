// tslint:disable
import fs from 'fs';
import child_process from 'child_process';
import path from 'path';

const readFile = filePath => new Promise((resolve, reject) => {
    fs.readFile(filePath, { encoding: 'utf8' }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
    });
});

const writeFile = (filePath, content) => new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, err => {
        if (err) reject(err);
        else resolve();
    });
});

const fileExists = filePath => new Promise((resolve, reject) => {
    fs.access(filePath, err => {
        if (err) {
            if (err.code === 'ENOENT') resolve(false);
            else reject(err);
        } else {
            resolve(true);
        }
    });
});

const readDir = dirPath => new Promise((resolve, reject) => {
    fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
        if (err) reject(err);
        else resolve(files);
    });
});

const runYarn = (args = [], cwd = null) => new Promise((reject, resolve) => {
    child_process.exec(['yarn', ...args].join(' '), { cwd }, (error, stdout) => {
        if (error) {
            reject(error);
        } else {
            resolve(stdout);
        }
    });
});

const modifyJsonFile = (filePath, modify) => readFile(filePath)
    .then(contentJson => JSON.stringify(modify(JSON.parse(contentJson)), null, 2) + '\n')
    .then(modified => writeFile(filePath, modified));

// List all directories under packages and dev-packages that have a package.json file
const listAllPackages = () => {
    const prodPackagesDir = path.resolve(process.cwd(), 'packages');
    const devPackagesDir = path.resolve(process.cwd(), 'dev-packages');

    return Promise.all([readDir(prodPackagesDir), readDir(devPackagesDir)])
        .then(([prodEntries, devEntries]) => {
            const prodDirs = prodEntries
                .filter(dirent => dirent.isDirectory())
                .map(({ name }) => [name, path.join(prodPackagesDir, name)]);

            const devDirs = devEntries
                .filter(dirent => dirent.isDirectory())
                .map(({ name }) => [name, path.join(devPackagesDir, name)]);

            const promises = [...prodDirs, ...devDirs].map(
                ([name, dir]) => fileExists(path.join(dir, 'package.json')).then(exists => [{ name, dir }, exists])
            );

            return Promise.all(promises);
        })
        .then(existences => existences.filter(([_, exists]) => exists).map(([packageData]) => packageData));
};

const mapDependencies = (version, theiaPackageNames, originalDeps = {}) => {
    return Object.entries(originalDeps).reduce((acc, [name, value]) => {
        const foundName = theiaPackageNames.find(theiaName => name === `@theia/${theiaName}`);

        return foundName
            ? { ...acc, [`@mcgordonite/theia-${foundName}`]: version }
            : { ...acc, [name]: value };
    }, {});
};

const main = args => {
    const version = args[0];

    if (!version) {
        console.log('Usage: node --experimental-modules publish.mjs <version>');
        process.exit(1);
    }

    console.log('Publishing all theia packages');

    listAllPackages()
        .then(theiaPackages => {
            const theiaPackageNames = theiaPackages.map(({ name }) => name);

            const promises = theiaPackages.map(({ name, dir }) => {
                const packageJsonPath = path.join(dir, 'package.json');

                return modifyJsonFile(
                    packageJsonPath,
                    current => ({
                        ...current,
                        name: `@mcgordonite/theia-${name}`,
                        version,
                        repository: {
                            "type": "git",
                            "url": "https://github.com/mcgordonite/theia.git"
                        },
                        dependencies: mapDependencies(version, theiaPackageNames, current.dependencies)
                    })
                );
            });

            return Promise.all(promises).then(() => theiaPackages);
        })
        .then(theiaPackages => new Promise((resolve, reject) => {
            console.log('===', theiaPackages);

            const run = index => {
                const theiaPackage = theiaPackages[index];
                console.log(`=== ${index} ${theiaPackage}`);

                if (theiaPackage) {
                    console.log(`Publishing ${theiaPackage.name}...`);

                    runYarn(['publish', '--new-version', version], theiaPackage.dir).then(
                        output => {
                            console.log(`=== ${output}`);
                            return run(index + 1)
                        },
                        reject
                    );
                } else {
                    resolve();
                }
            };

            // Run in series
            run(0);
        }))
        .then(
            () => {
                console.log("Done");
                process.exit(0);
            },
            error => {
                console.error(error);
                process.exit(1);
            }
        );
};

main(process.argv.slice(2));
