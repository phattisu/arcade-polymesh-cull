

//% block="Poly mesh" color="#279139" icon="\uf1b2" groups='["Create","Controls","Styling"]'
namespace Polymesh {

    export enum Angles {
        //% block="x"
        AngleX = 0,
        //% block="y"
        AngleY = 1,
        //% block="z"
        AngleZ = 2,
    }
    export enum Cameras {
        //% block="x"
        CamX = 0,
        //% block="y"
        CamY = 1,
        //% block="z"
        CamZ = 2,
    }
    export enum SortingMethods {
        //% block="accurate"
        Accurate = 0,
        //% block="fast"
        Fast = 1,
        //% block="fast and accurate"
        FastAndAccurate = 2,
    }

    //% blockid=poly_newmesh
    //% block="create new mesh"
    //% blockSetVariable=myMesh
    //% weight=100
    export function newmesh() { return new mesh() }

    export class mesh {
        cts: { indices: number[], color: number, img?: Image }[]
        cvs: { x: number, y: number, z: number }[]

        constructor() {
            this.cts = [{ indices: [0, 0, 0], color: 0, img: null }]
            this.cvs = [{ x: 0, y: 0, z: 0 }]
        }

        //% blockid=poly_addvertice
        //% block=" $this set vertice at $idx by x: $x y: $y z: $z"
        //% this.shadow=variables_get this.defl=myMesh
        //% ccv.shadow=poly_shadow_vertice
        //% weight=88
        public setvertice(idx: number, x: number, y: number, z: number) { this.cvs[idx] = { x: x, y: y, z: z } }

        //% blockid=poly_addtriangle
        //% block=" $this set triangle in color $c at $idx by idc1 $i1 idc2 $i2 idc3 $i3|| idc4 $i4 and texture $img"
        //% this.shadow=variables_get this.defl=myMesh
        //% cct.shadow=poly_shadow_triangle
        //% c.shadow=colorindexpicker
        //% weight=87
        public settriangle(idx: number, c: number, i1: number, i2: number, i3: number, i4?: number, img?: Image) {
            if (i4) {
                if (img) this.cts[idx] = { indices: [i1, i2, i3, i4], color: c, img: img }
                else this.cts[idx] = { indices: [i1, i2, i3, i4], color: c }
            } else this.cts[idx] = { indices: [i1, i2, i3], color: c }
        }

        //% blockid=poly_delvertice
        //% block=" $this remove vertice at $idx"
        //% this.shadow=variables_get this.defl=myMesh
        //% weight=86
        public delvertice(idx: number) { this.cvs.removeAt(idx) }

        //% blockid=poly_deltriangle
        //% block=" $this remove triangle at $idx"
        //% this.shadow=variables_get this.defl=myMesh
        //% weight=85
        public deltriangle(idx: number) { this.cts.removeAt(idx) }

    }

    let axchange = 0, azchange = 0, aychange = 0
    let camx = 0, camy = 0, camz = 0
    let sizechange = 0, sort = 2

    //% blockid=poly_rendermesh
    //% block=" $mymesh render to $image|| as inner? $innered"
    //% mymesh.shadow=variables_get mymesh.defl=myMesh
    //% image.shadow=screen_image_picker
    //% weight=80
    export function render(mymesh: mesh, image: Image, innered?: boolean) {
        function update() {
            let bg = image, bgsave = bg.clone()
            let angleX = axchange
            let angleY = aychange
            let angleZ = azchange
            let centerX = image.width / 2, centerY = image.height / 2;
            let size = 1 + sizechange

            let vertices = mymesh.cvs, triangles = mymesh.cts;
            vertices = vertices.map((vertex) => { return { x: vertex.x * size, y: vertex.y * size, z: vertex.z * size } })
            let zerosArray: number[] = [];
            for (let i = 0; i < vertices.length; i++) zerosArray.push(0);
            let cosX = Math.cos(angleX), sinX = Math.sin(angleX);
            let cosY = Math.cos(angleY), sinY = Math.sin(angleY);
            let cosZ = Math.cos(angleZ), sinZ = Math.sin(angleZ);

            let rotatedVertices = vertices.map((vertex, index) => {
                let x = vertex.x, y = vertex.y, z = vertex.z;
                if (!(index > 5 && index < 9)) x -= camx, y -= camy, z -= camz;
                // Rotate y
                let cosY = Math.cos(angleY), sinY = Math.sin(angleY);
                let rotatedX = x * cosY + z * sinY, rotatedZ = -x * sinY + z * cosY;

                // Rotate x
                let cosX = Math.cos(angleX), sinX = Math.sin(angleX);
                let rotatedZ2 = rotatedZ * cosX - y * sinX, rotatedY2 = rotatedZ * sinX + y * cosX;

                // Rotate z
                let cosZ = Math.cos(angleZ), sinZ = Math.sin(angleZ);
                let rotatedX2 = rotatedX * cosZ - rotatedY2 * sinZ, rotatedY3 = rotatedX * sinZ + rotatedY2 * cosZ;

                // perspective
                let scaleFactor = 150 / (150 + rotatedZ2);
                let projectedX = rotatedX2 * scaleFactor, projectedY = rotatedY2 * scaleFactor;

                // screen coordinates
                let screenX = centerX + projectedX, screenY = centerY + projectedY;

                if (rotatedZ2 <= -100) zerosArray[index] = 1
                return { x: screenX, y: screenY, z: rotatedZ2 };
            });

            function quicksort(arr: any[], low: number, high: number, rotatedVertices: any[]) {
                if (low < high) {
                    let pivotIndex = choosePivot(arr, low, high, rotatedVertices), partitionIndex = partition(arr, low, high, rotatedVertices, pivotIndex);

                    quicksort(arr, low, partitionIndex - 1, rotatedVertices);
                    quicksort(arr, partitionIndex + 1, high, rotatedVertices);
                }
            }

            function choosePivot(arr: any[], low: number, high: number, rotatedVertices: any[]): number {
                // Choose the median of three values: low, middle, high
                let middle = Math.floor((low + high) / 2);

                if (averageZ(rotatedVertices, arr[low].indices) > averageZ(rotatedVertices, arr[middle].indices)) [arr[low], arr[middle]] = [arr[middle], arr[low]];
                if (averageZ(rotatedVertices, arr[low].indices) > averageZ(rotatedVertices, arr[high].indices)) [arr[low], arr[high]] = [arr[high], arr[low]];
                if (averageZ(rotatedVertices, arr[middle].indices) > averageZ(rotatedVertices, arr[high].indices)) [arr[middle], arr[high]] = [arr[high], arr[middle]];

                return middle;
            }

            function partition(arr: any[], low: number, high: number, rotatedVertices: any[], pivotIndex: number): number {
                let pivotValue = averageZ(rotatedVertices, arr[pivotIndex].indices);
                let i = low - 1;

                for (let j = low; j <= high; j++) {
                    let currentAverageZ = averageZ(rotatedVertices, arr[j].indices);
                    if (currentAverageZ > pivotValue) {
                        i++;
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                }

                [arr[i + 1], arr[pivotIndex]] = [arr[pivotIndex], arr[i + 1]];
                return i + 1;
            }

            function averageZ(rotatedVertices: any[], indices: number[]): number {
                let z = 0
                for (const ind of indices) z += rotatedVertices[ind].z
                return z / indices.length
            }

            function quicksort2(triangles: any[], low: number, high: number, rotatedVertices: any[]) {
                while (low < high) {
                    let pi = partition2(triangles, low, high, rotatedVertices);

                    // Optimize the recursion by tail call optimization
                    if (pi - low < high - pi) {
                        quicksort2(triangles, low, pi - 1, rotatedVertices);
                        low = pi + 1;
                    } else {
                        quicksort2(triangles, pi + 1, high, rotatedVertices);
                        high = pi - 1;
                    }
                }
            }

            function partition2(triangles: any[], low: number, high: number, rotatedVertices: any[]) {
                let pivot = calculateAverageZ2(triangles[high], rotatedVertices), i = low;

                for (let j = low; j < high; j++) {
                    if (calculateAverageZ2(triangles[j], rotatedVertices) > pivot) {
                        // Swap triangles[i] and triangles[j]
                        let temp = triangles[i];
                        triangles[i] = triangles[j], triangles[j] = temp;
                        i++;
                    }
                }

                // Swap triangles[i] and triangles[high]
                let temp = triangles[i];
                triangles[i] = triangles[high], triangles[high] = temp;

                return i;
            }

            function calculateAverageZ2(triangle: { indices: number[] }, rotatedVertices: { z: number }[]) {
                let z = 0
                for (const ind of triangle.indices) z += rotatedVertices[ind].z
                return z / triangle.indices.length;
            }

            switch (sort) {
                case 0:
                    triangles.sort((b, a) => {
                        let zA = 0
                        for (const ind of a.indices) zA += rotatedVertices[ind].z
                        let zB = 0
                        for (const ind of b.indices) zB += rotatedVertices[ind].z
                        return (zA / a.indices.length) - (zB / b.indices.length);
                    });
                    break; case 1:
                    quicksort(triangles, 0, triangles.length - 1, rotatedVertices);
                    break; case 2:
                    quicksort2(triangles, 0, triangles.length - 1, rotatedVertices);
                    break;
            }

            function distranceCulling(posXYZs: { x: number, y: number, z: number }[], posXYZ: { x: number, y: number, z: number }, inner?: boolean) {
                for (const pos of posXYZs) {
                    if ((!inner && pos.z > posXYZ.z) || (inner && pos.z < posXYZ.z) || (pos.z == posXYZ.z)) return true
                }
                return false
            }

            function isStayInScreen(posXYZ: { x: number, y: number, z: number }[], ind: number[]) {
                const x1 = posXYZ[ind[0]].x, y1 = posXYZ[ind[0]].y
                const x2 = posXYZ[ind[1]].x, y2 = posXYZ[ind[1]].y
                const x3 = posXYZ[ind[2]].x, y3 = posXYZ[ind[2]].y
                let x4: number, y4: number
                if (ind[3]) x4 = posXYZ[ind[3]].x, y4 = posXYZ[ind[3]].y
                const stayInScreen = function (x: number, y: number) { return (x && y ? (x < 0 || x >= image.width) && (y < 0 || y >= image.height) : true) }
                if (x4 && y4) return !(stayInScreen(x1, y1) || stayInScreen(x2, y2) || stayInScreen(x3, y3) || stayInScreen(x4, x4))
                return !(stayInScreen(x1, y1) || stayInScreen(x2, y2) || stayInScreen(x3, y3))
            }

            function distortImage(Input: Image, Output: Image, X1: number, Y1: number, X2: number, Y2: number, X3: number, Y3: number, X4: number, Y4: number) {
                for (let y = 0; y < Input.height; y++) {
                    for (let x = 0; x < Input.width; x++) {
                        const sizei = Math.max(1, size), xi = x, yi = y
                        const x0 = Math.trunc((1 - (yi) / Input.height) * (X1 + (xi) / Input.width * (X2 - X1)) + (yi) / Input.height * (X3 + (xi) / Input.width * (X4 - X3))) - Math.floor(sizei / 2)
                        const y0 = Math.trunc((1 - (xi) / Input.width) * (Y1 + (yi) / Input.height * (Y3 - Y1)) + (xi) / Input.width * (Y2 + (yi) / Input.height * (Y4 - Y2))) - Math.floor(sizei / 2)
                        const x1 = Math.trunc((1 - (yi + sizei / 2) / Input.height) * (X1 + (xi + size / 2) / Input.width * (X2 - X1)) + (yi + sizei / 2) / Input.height * (X3 + (xi + size / 2) / Input.width * (X4 - X3))) - Math.floor(sizei / 2)
                        const y1 = Math.trunc((1 - (xi + size / 2) / Input.width) * (Y1 + (yi + sizei / 2) / Input.height * (Y3 - Y1)) + (xi + size / 2) / Input.width * (Y2 + (yi + sizei / 2) / Input.height * (Y4 - Y2))) - Math.floor(sizei / 2)
                        const col = Input.getPixel(Input.width - x - 1, Input.height - y - 1)
                        if (col > 0) {
                            //Output.setPixel(xi - 1, yi - 1, col)
                            //Output.setPixel(xi - 1, yi + 1, col)
                            //Output.setPixel(xi + 1, yi + 1, col)
                            //Output.setPixel(xi + 1, yi - 1, col)
                            //Output.setPixel(xi - 1, yi, col)
                            //Output.setPixel(xi + 1, yi, col)
                            //Output.setPixel(xi, yi - 1, col)
                            //Output.setPixel(xi, yi + 1, col)
                            //Output.setPixel(xi, yi, col)
                            helpers.imageFillPolygon4(Output, x0, y0, x1, y0, x1, y1, x0, y1, col)
                        }
                    }
                }
            }

            for (let i = 0; i < triangles.length; i++) {
                let triangle = triangles[i], indices = triangle.indices, color = triangle.color;
                if (zerosArray[indices[0]] < 1 && zerosArray[indices[1]] < 1 && zerosArray[indices[2]] < 1 && (indices[3] ? zerosArray[indices[3]] < 1 : true)) {
                    if (distranceCulling(rotatedVertices, rotatedVertices[indices[0]], innered) && distranceCulling(rotatedVertices, rotatedVertices[indices[1]], innered) && distranceCulling(rotatedVertices, rotatedVertices[indices[2]], innered) && (indices[3] ? distranceCulling(rotatedVertices, rotatedVertices[indices[3]], innered) : true))
                        if (isStayInScreen(rotatedVertices, indices)) {
                            if (indices.length === 3) helpers.imageFillTriangle(bg, rotatedVertices[indices[0]].x, rotatedVertices[indices[0]].y, rotatedVertices[indices[1]].x, rotatedVertices[indices[1]].y, rotatedVertices[indices[2]].x, rotatedVertices[indices[2]].y, color)
                            else if (indices.length === 4) {
                                helpers.imageFillTriangle(bg, rotatedVertices[indices[0]].x, rotatedVertices[indices[0]].y, rotatedVertices[indices[1]].x, rotatedVertices[indices[1]].y, rotatedVertices[indices[2]].x, rotatedVertices[indices[2]].y, color)
                                helpers.imageFillTriangle(bg, rotatedVertices[indices[3]].x, rotatedVertices[indices[3]].y, rotatedVertices[indices[1]].x, rotatedVertices[indices[1]].y, rotatedVertices[indices[2]].x, rotatedVertices[indices[2]].y, color)
                                if (triangle.img) distortImage(triangle.img, bg, rotatedVertices[indices[0]].x, rotatedVertices[indices[0]].y, rotatedVertices[indices[1]].x, rotatedVertices[indices[1]].y, rotatedVertices[indices[2]].x, rotatedVertices[indices[2]].y, rotatedVertices[indices[3]].x, rotatedVertices[indices[3]].y)
                            }
                        }
                }
                //scene.backgroundImage().fillTriangle(rotatedVertices[indices[0]].x, rotatedVertices[indices[0]].y, rotatedVertices[indices[1]].x, rotatedVertices[indices[1]].y, rotatedVertices[indices[2]].x, rotatedVertices[indices[2]].y, color);
            }
            rotatedVertices.length = 0, triangles.length = 0;

            console.log(zerosArray)

        }
        update()
    }

    //% blockid=poly_angle_change
    //% block="change angle $choice by $x"
    //% weight=60
    export function changeAngle(choice: Angles, x: number) {
        switch (choice) {
            case 0: axchange += x; break
            case 1: aychange += x; break
            case 2: azchange += x; break
        }
    }
    //% blockid=poly_camera_change
    //% block="change camera $choice by $x"
    //% weight=59
    export function changeCam(choice: Cameras, x: number) {
        switch (choice) {
            case 0: camx += x; break
            case 1: camy += x; break
            case 2: camz += x; break
        }
    }
    //% blockid=poly_angle_set
    //% block="set $choice to $x"
    //% weight=58
    export function setAngle(choice: Angles, x: number) {
        switch (choice) {
            case 0: axchange = x; break
            case 1: aychange = x; break
            case 2: azchange = x; break
        }
    }
    //% blockid=poly_camera_set
    //% block="set camera $choice by $x"
    //% weight=59
    export function setCam(choice: Cameras, x: number) {
        switch (choice) {
            case 0: camx = x; break
            case 1: camy = x; break
            case 2: camz = x; break
        }
    }
    //% blockid=poly_size
    //% block="set size to $x"
    //% weight=50
    export function setSize(x: number) {
        sizechange = x
    }

    //% blockid=poly_sorttype
    //% block="set sorting method to $method"
    //% weight=49
    export function sortingMethod(method: SortingMethods) {
        sort = method
    }

    //% blockid=poly_angle_x
    //% block="angle x"
    //% weight=40
    export function angleX() {
        return axchange
    }
    //% blockid=poly_angle_y
    //% block="angle y"
    //% weight=39
    export function angleY() {
        return aychange
    }
    //% blockid=poly_angle_z
    //% block="angle z"
    //% weight=38
    export function angleZ() {
        return azchange
    }

    //% blockid=poly_camera_setpos
    //% block="set camera position to x: $x y: $y z: $z"
    //% weight=48
    export function setcCampos(x: number, y: number, z: number) {
        camx = x
        camy = y
        camz = z
    }

}