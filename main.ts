
//% block="Poly mesh" color="#279139" icon="\uf1b2" groups='["Create","Controls","Styling"]'
namespace Polymesh {

    export enum Angles {
        //% block="Angle x"
        AngleX = 0,
        //% block="Angle y"
        AngleY = 1,
        //% block="Angle z"
        AngleZ = 2,
    }
    export enum Cameras {
        //% block="Camera x"
        CamX = 0,
        //% block="Camera y"
        CamY = 1,
        //% block="Camera z"
        CamZ = 2,
        //% block="Camera zoom"
        Zoom = 3,
    }
    export enum SortingMethods {
        //% block="accurate"
        Accurate = 0,
        //% block="fast"
        Fast = 1,
    }

    //% blockid=poly_newmesh
    //% block="create new mesh"
    //% blockSetVariable=myMesh
    //% group="create"
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
        //% group="setter"
        //% weight=88
        public setvertice(idx: number, x: number, y: number, z: number) { this.cvs[idx] = { x: x, y: y, z: z } }

        //% blockid=poly_addtriangle
        //% block=" $this set triangle in color $c at $idx by idc1 $i1 idc2 $i2 idc3 $i3|| idc4 $i4 and texture $img=screen_image_picker"
        //% this.shadow=variables_get this.defl=myMesh
        //% cct.shadow=poly_shadow_triangle
        //% c.shadow=colorindexpicker
        //% group="setter"
        //% weight=87
        public settriangle(idx: number, c: number, i1: number, i2: number, i3: number, i4?: number, img?: Image) {
            let indice = [i1, i2, i3]
            if (i4) indice.push(i4)
            if (i4 && img) this.cts[idx] = { indices: indice, color: c, img: img }
            else this.cts[idx] = { indices: indice, color: c }
        }

        //% blockid=poly_delvertice
        //% block=" $this remove vertice at $idx"
        //% this.shadow=variables_get this.defl=myMesh
        //% group="remover"
        //% weight=86
        public delvertice(idx: number) { this.cvs.removeAt(idx) }

        //% blockid=poly_deltriangle
        //% block=" $this remove triangle at $idx"
        //% this.shadow=variables_get this.defl=myMesh
        //% group="remover"
        //% weight=85
        public deltriangle(idx: number) { this.cts.removeAt(idx) }

    }

    let ax = 0, az = 0, ay = 0
    let camx = 0, camy = 0, camz = 0
    let zoom = 1, sort = 0

    //% blockid=poly_rendermesh
    //% block=" $mymesh render to $image|| as inner? $inner"
    //% mymesh.shadow=variables_get mymesh.defl=myMesh
    //% image.shadow=screen_image_picker
    //% inner.shadow=toggleYesNo
    //% group="render"
    //% weight=80
    export function render(mymesh: mesh, image: Image, inner: boolean = false) {
        const centerX = image.width >> 1;
        const centerY = image.height >> 1;

        const cox = Math.cos(ax), sinX = Math.sin(ax);
        const coy = Math.cos(ay), sinY = Math.sin(ay);
        const cosZ = Math.cos(az), sinZ = Math.sin(az);

        // Transform vertices
        const rotated = mymesh.cvs.map(v => {
            let x = v.x - camx;
            let y = v.y - camy;
            let z = v.z - camz;

            // Rotate Y
            let tx = x * coy + z * sinY;
            z = -x * sinY + z * coy;
            x = tx;

            // Rotate X
            let ty = y * cox - z * sinX;
            z = y * sinX + z * cox;
            y = ty;

            // Rotate Z
            tx = x * cosZ - y * sinZ;
            y = x * sinZ + y * cosZ;
            x = tx;

            // Perspective
            const dist = 150;
            const scale = dist / (dist + z);
            return {
                x: centerX + x * scale * zoom,
                y: centerY + y * scale * zoom,
                z: z
            };
        });

        // Sort triangles
        const tris = mymesh.cts.slice();
        switch (sort) {
            case 0: tris.sort((a, b) => avgZ(rotated, b.indices) - avgZ(rotated, a.indices)); break
            case 1: default: quickSort(tris, 0, tris.length - 1, rotated); break
        }
        // Render
        let pic: Image, pici: Image
        for (const t of tris) {
            const inds = t.indices;
            if (inds.some(i => rotated[i].z < -150)) continue;
            if (inds.every(i => (rotated[i].x < 0 || rotated[i].x >= image.width) || (rotated[i].y < 0 || rotated[i].y >= image.height))) continue;

            const depthCheck = rotated.some((ro) => ((inner ? inds.every(i => rotated[i].z > ro.z) : inds.every(i => rotated[i].z < ro.z)) || inds.every(i => rotated[i].z == ro.z)))
            if (!depthCheck) continue;

            // Draw solid
            if (inds.length === 3) {
                helpers.imageFillTriangle(
                    image,
                    rotated[inds[0]].x, rotated[inds[0]].y,
                    rotated[inds[1]].x, rotated[inds[1]].y,
                    rotated[inds[2]].x, rotated[inds[2]].y,
                    t.color
                );
            } else if (inds.length === 4) {
                helpers.imageFillTriangle(
                    image,
                    rotated[inds[0]].x, rotated[inds[0]].y,
                    rotated[inds[1]].x, rotated[inds[1]].y,
                    rotated[inds[2]].x, rotated[inds[2]].y,
                    t.color
                );
                helpers.imageFillTriangle(
                    image,
                    rotated[inds[3]].x, rotated[inds[3]].y,
                    rotated[inds[1]].x, rotated[inds[1]].y,
                    rotated[inds[2]].x, rotated[inds[2]].y,
                    t.color
                );
            }

            // Draw texture over
            if (t.img && inds.length === 4) {
                if (!pic || !pic.equals(t.img)) {
                    pic = t.img.clone()
                    pici = scaleXn(pic.clone(), zoom)
                }
                distortImage(pici, image,
                    rotated[inds[0]].x, rotated[inds[0]].y,
                    rotated[inds[1]].x, rotated[inds[1]].y,
                    rotated[inds[2]].x, rotated[inds[2]].y,
                    rotated[inds[3]].x, rotated[inds[3]].y
                );
            }
        }
    }

    export function scaleXn(original: Image, sc: number): Image {
        // Double the size of the original.
        const scale = Math.ceil(Math.max(1, sc) * 1.2), toReturn: Image = image.create(original.width * scale, original.height * scale);

        for (let x: number = 0; x < original.width; x++) for (let y: number = 0; y < original.height; y++) helpers.imageFillRect(toReturn, x * scale, y * scale, scale, scale, original.getPixel(x, y))
        return toReturn;
    }

    function quickSort(arr: { indices: number[] }[], left: number, right: number, rot: { z: number }[]) {
        if (left >= right) return;
        const pivotIndex = left + ((right - left) >> 1);
        const pivotValue = avgZ(rot, arr[pivotIndex].indices);
        const index = partition(arr, left, right, pivotValue, rot);
        quickSort(arr, left, index - 1, rot);
        quickSort(arr, index, right, rot);
    }

    function partition(arr: { indices: number[] }[], left: number, right: number, pivot: number, rot: { z: number }[]) {
        while (left <= right) {
            while (avgZ(rot, arr[left].indices) > pivot) left++;
            while (avgZ(rot, arr[right].indices) < pivot) right--;
            if (left <= right) {
                const tmp = arr[left];
                arr[left] = arr[right];
                arr[right] = tmp;
                left++;
                right--;
            }
        }
        return left;
    }

    function avgZ(rot: { z: number }[], inds: number[]): number {
        return inds.reduce((s, i) => s + rot[i].z, 0) / inds.length;
    }

    function distortImage(src: Image, dest: Image,
        X1: number, Y1: number, X2: number, Y2: number,
        X3: number, Y3: number, X4: number, Y4: number) {
        for (let y = 0; y < src.height; y++) {
            for (let x = 0; x < src.width; x++) {
                const col = src.getPixel(src.width - x, src.height - y);
                if (col && col > 0) dest.setPixel(Math.trunc((1 - y / src.height) * (X1 + x / src.width * (X2 - X1)) + y / src.height * (X3 + x / src.width * (X4 - X3))), Math.trunc((1 - x / src.width) * (Y1 + y / src.height * (Y3 - Y1)) + x / src.width * (Y2 + y / src.height * (Y4 - Y2))), col);
            }
        }
    }

    //% blockid=poly_angle_change
    //% block="change $choice by $x"
    //% group="angle"
    //% weight=60
    export function changeAngle(choice: Angles, x: number) {
        switch (choice) {
            case 0: ax += x; break
            case 1: ay += x; break
            case 2: az += x; break
        }
    }
    //% blockid=poly_camera_change
    //% block="change $choice by $x"
    //% group="camera"
    //% weight=59
    export function changeCam(choice: Cameras, x: number) {
        switch (choice) {
            case 0: camx += x; break
            case 1: camy += x; break
            case 2: camz += x; break
            case 3: zoom += x; break
        }
    }
    //% blockid=poly_angle_set
    //% block="set $choice to $x"
    //% group="angle"
    //% weight=58
    export function setAngle(choice: Angles, x: number) {
        switch (choice) {
            case 0: ax = x; break
            case 1: ay = x; break
            case 2: az = x; break
        }
    }
    //% blockid=poly_camera_set
    //% block="set $choice by $x"
    //% group="camera"
    //% weight=57
    export function setCam(choice: Cameras, x: number) {
        switch (choice) {
            case 0: camx = x; break
            case 1: camy = x; break
            case 2: camz = x; break
            case 3: zoom = x; break
        }
    }

    //% blockid=poly_sorttype
    //% block="set sorting method to $method"
    //% group="sorting"
    //% weight=49
    export function sortingMethod(method: SortingMethods) {
        sort = method
    }

    //% blockid=poly_angle_get
    //% block="$choice"
    //% group="angle"
    //% weight=40
    export function getAngle(choice: Angles) {
        switch (choice) {
            case 0: return ax
            case 1: return ay
            case 2: return az
        }
        return 0
    }

    //% blockid=poly_camera_get
    //% block="$choice"
    //% group="camera"
    //% weight=44
    export function getCam(choice: Cameras) {
        switch (choice) {
            case 0: return camx
            case 1: return camy
            case 2: return camz
            case 3: return zoom
        }
        return 0
    }

    //% blockid=poly_camera_setpos
    //% block="set camera position to x: $x y: $y z: $z"
    //% group="camera"
    //% weight=48
    export function setcCampos(x: number, y: number, z: number) {
        camx = x
        camy = y
        camz = z
    }

}
