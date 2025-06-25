
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
        //% block=" $this set triangle in color $c at $idx by idc1 $i1 idc2 $i2 idc3 $i3|| idc4 $i4 and texture $img=screen_image_picker"
        //% this.shadow=variables_get this.defl=myMesh
        //% cct.shadow=poly_shadow_triangle
        //% c.shadow=colorindexpicker
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
    //% block=" $mymesh render to $image|| as inner? $inner"
    //% mymesh.shadow=variables_get mymesh.defl=myMesh
    //% image.shadow=screen_image_picker
    //% weight=80
    export function render(mymesh: mesh, image: Image, inner?: boolean) {
        const centerX = image.width / 2;
        const centerY = image.height / 2;
        const size = 1 + sizechange;

        // Transform vertices
        const rotated = mymesh.cvs.map(v => {
            let x = (v.x - camx) * size;
            let y = (v.y - camy) * size;
            let z = (v.z - camz) * size;

            // Rotate Y
            const cosY = Math.cos(aychange), sinY = Math.sin(aychange);
            [x, z] = [x * cosY + z * sinY, -x * sinY + z * cosY];

            // Rotate X
            const cosX = Math.cos(axchange), sinX = Math.sin(axchange);
            [y, z] = [y * cosX - z * sinX, y * sinX + z * cosX];

            // Rotate Z
            const cosZ = Math.cos(azchange), sinZ = Math.sin(azchange);
            [x, y] = [x * cosZ - y * sinZ, x * sinZ + y * cosZ];

            const scale = 150 / (150 + z);
            return {
                x: centerX + x * scale,
                y: centerY + y * scale,
                z
            };
        });

        // Sort
        const tris = mymesh.cts.slice();
        if (sort == SortingMethods.Accurate) {
            tris.sort((a, b) => avgZ(b, rotated) - avgZ(a, rotated));
        } else {
            quicksort(tris, 0, tris.length - 1, rotated);
        }

        for (const t of tris) {
            if (shouldCull(t.indices, rotated, inner)) continue;
            if (!onScreen(t.indices, rotated, image)) continue;

            // Solid color
            if (t.indices.length == 3) {
                helpers.imageFillTriangle(image,
                    rotated[t.indices[0]].x, rotated[t.indices[0]].y,
                    rotated[t.indices[1]].x, rotated[t.indices[1]].y,
                    rotated[t.indices[2]].x, rotated[t.indices[2]].y,
                    t.color);
            } else if (t.indices.length == 4) {
                helpers.imageFillTriangle(image,
                    rotated[t.indices[0]].x, rotated[t.indices[0]].y,
                    rotated[t.indices[1]].x, rotated[t.indices[1]].y,
                    rotated[t.indices[2]].x, rotated[t.indices[2]].y,
                    t.color);
                helpers.imageFillTriangle(image,
                    rotated[t.indices[3]].x, rotated[t.indices[3]].y,
                    rotated[t.indices[1]].x, rotated[t.indices[1]].y,
                    rotated[t.indices[2]].x, rotated[t.indices[2]].y,
                    t.color);
            }

            // Texture (overpaint)
            if (t.img && t.indices.length == 4) {
                renderMode7(t.img, image,
                    rotated[t.indices[0]].x, rotated[t.indices[0]].y,
                    rotated[t.indices[1]].x, rotated[t.indices[1]].y,
                    rotated[t.indices[2]].x, rotated[t.indices[2]].y,
                    rotated[t.indices[3]].x, rotated[t.indices[3]].y);
            }
        }
    }

    function avgZ(tri: { indices: number[] }, v: { z: number }[]) {
        return tri.indices.reduce((s, i) => s + v[i].z, 0) / tri.indices.length;
    }

    function quicksort(arr: any[], lo: number, hi: number, v: { z: number }[]) {
        if (lo < hi) {
            const p = partition(arr, lo, hi, v);
            quicksort(arr, lo, p - 1, v);
            quicksort(arr, p + 1, hi, v);
        }
    }

    function partition(arr: any[], lo: number, hi: number, v: { z: number }[]) {
        const pivot = avgZ(arr[hi], v);
        let i = lo;
        for (let j = lo; j < hi; j++) {
            if (avgZ(arr[j], v) > pivot) {
                [arr[i], arr[j]] = [arr[j], arr[i]];
                i++;
            }
        }
        [arr[i], arr[hi]] = [arr[hi], arr[i]];
        return i;
    }

    function shouldCull(idx: number[], v: { z: number }[], inner?: boolean) {
        return idx.some(i => (inner ? v[i].z < -100 : v[i].z > 100));
    }

    function onScreen(idx: number[], v: { x: number; y: number }[], img: Image) {
        return idx.some(i => v[i].x >= 0 && v[i].x < img.width && v[i].y >= 0 && v[i].y < img.height);
    }

    function renderMode7(src: Image, dst: Image, 
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        x4: number, y4: number) {
        
        for (let y = 0; y < src.height; y++) {
            for (let x = 0; x < src.width; x++) {
                const fx = x / src.width;
                const fy = y / src.height;
                const dx = (1 - fy) * ((1 - fx) * x1 + fx * x2) + fy * ((1 - fx) * x4 + fx * x3);
                const dy = (1 - fy) * ((1 - fx) * y1 + fx * y2) + fy * ((1 - fx) * y4 + fx * y3);
                const col = src.getPixel(x, y);
                if (col > 0) dst.setPixel(dx | 0, dy | 0, col);
            }
        }
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
