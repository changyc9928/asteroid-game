"use strict";
function asteroids() {
    const svg = document.getElementById("canvas");
    let g = new Elem(svg, 'g')
        .attr("transform", "translate(300 300)")
        .attr("speed", "1");
    let ship = new Elem(svg, 'polygon', g.elem)
        .attr("points", "-15,20 15,20 0,-20")
        .attr("style", "fill:lime;stroke:purple;stroke-width:1");
    const radToDeg = (rad) => rad * 180 / Math.PI + 90, degToRad = (deg) => deg * Math.PI / 180 - (Math.PI / 2);
    const transformMatrix = (e) => new WebKitCSSMatrix(window.getComputedStyle(e.elem).webkitTransform);
    Observable.fromEvent(svg, "mousemove")
        .map(({ clientX, clientY }) => {
        const lookx = clientX - svg.getBoundingClientRect().left, looky = clientY - svg.getBoundingClientRect().top, x = transformMatrix(g).m41, y = transformMatrix(g).m42;
        return {
            x: transformMatrix(g).m41,
            y: transformMatrix(g).m42,
            angle: radToDeg(Math.atan2(looky - y, lookx - x))
        };
    }).filter(({ angle }) => angle != 0 && angle != 180)
        .map(({ x, y, angle }) => g.attr("transform", "translate(" + x + " " + y + ")" +
        "rotate(" + angle + ")"))
        .subscribe(_ => _);
    const keydown = Observable.fromEvent(document, "keydown")
        .map(e => {
        const transform = g.attr("transform"), x = transformMatrix(g).m41, y = transformMatrix(g).m42, distance = 8, temp = transform.split("("), angle = parseFloat(temp[temp.length - 1].split(")")[0]);
        return {
            e: e,
            y: y,
            x: x,
            distance: distance,
            angle: angle
        };
    });
    const keyW = keydown.filter(({ e }) => e.key == "w")
        .map(({ e, y, x, angle }) => {
        const distance = parseFloat(g.attr("speed")), dx = x + distance * Math.cos(degToRad(angle)), dy = y + distance * Math.sin(degToRad(angle));
        return {
            e: e,
            y: y,
            x: x,
            dx: dx,
            dy: dy,
            distance: distance,
            angle: angle
        };
    });
    keyW.subscribe(({ dx, dy, angle, distance }) => g.attr("transform", "translate(" + dx + " " + dy + ")" +
        "rotate(" + angle + ")").attr('speed', (distance + 0.5).toString()));
    const braking = Observable.fromEvent(document, "keyup").filter(e => e.key == "w")
        .flatMap(e => {
        return Observable.interval(30).takeUntil(keyW).filter(() => parseFloat(g.attr('speed')) >= 1.5).map(e => {
            const transform = g.attr("transform"), x = transformMatrix(g).m41, y = transformMatrix(g).m42, distance = parseFloat(g.attr("speed")), temp = transform.split("("), angle = parseFloat(temp[temp.length - 1].split(")")[0]), dx = x + distance * Math.cos(degToRad(angle)), dy = y + distance * Math.sin(degToRad(angle));
            return {
                dx: dx,
                dy: dy,
                angle: angle,
                distance: distance
            };
        });
    });
    braking.subscribe(({ dx, dy, angle, distance }) => g.attr("transform", "translate(" + dx + " " + dy + ")" +
        "rotate(" + angle + ")").attr('speed', (distance - 1).toString()));
    const keyS = keydown
        .filter(({ e }) => e.key == "s").map(({ y, x, distance, angle }) => {
        const dx = x - distance * Math.cos(degToRad(angle)), dy = y - distance * Math.sin(degToRad(angle));
        return {
            dx: dx,
            dy: dy,
            angle: angle
        };
    });
    keyS.subscribe(({ dx, dy, angle }) => g.attr("transform", "translate(" + dx + " " + dy + ")" +
        "rotate(" + angle + ")"));
    const keyA = keydown
        .filter(({ e }) => e.key == "a").map(({ y, x, distance, angle }) => {
        const dx = x - distance * Math.cos(degToRad(angle) + Math.PI / 2), dy = y - distance * Math.sin(degToRad(angle) + Math.PI / 2);
        return {
            dx: dx,
            dy: dy,
            angle: angle
        };
    });
    keyA.subscribe(({ dx, dy, angle }) => g.attr("transform", "translate(" + dx + " " + dy + ")" +
        "rotate(" + angle + ")"));
    const keyD = keydown
        .filter(({ e }) => e.key == "d").map(({ y, x, distance, angle }) => {
        const dx = x + distance * Math.cos(degToRad(angle) + Math.PI / 2), dy = y + distance * Math.sin(degToRad(angle) + Math.PI / 2);
        return {
            dx: dx,
            dy: dy,
            angle: angle
        };
    });
    keyD.subscribe(({ dx, dy, angle }) => g.attr("transform", "translate(" + dx + " " + dy + ")" +
        "rotate(" + angle + ")"));
    const outOfBound = (observable) => {
        observable.filter(({ dx }) => dx > 600).subscribe(({ dy, angle }) => g.attr("transform", "translate(" + 0 + " " + dy + ")" +
            "rotate(" + angle + ")"));
        observable.filter(({ dx }) => dx < 0).subscribe(({ dy, angle }) => g.attr("transform", "translate(" + 600 + " " + dy + ")" +
            "rotate(" + angle + ")"));
        observable.filter(({ dy }) => dy > 600).subscribe(({ dx, angle }) => g.attr("transform", "translate(" + dx + " " + 0 + ")" +
            "rotate(" + angle + ")"));
        observable.filter(({ dy }) => dy < 0).subscribe(({ dx, angle }) => g.attr("transform", "translate(" + dx + " " + 600 + ")" +
            "rotate(" + angle + ")"));
    };
    outOfBound(keyW);
    outOfBound(keyA);
    outOfBound(keyS);
    outOfBound(keyD);
    outOfBound(braking);
    Observable.interval(10).flatMap(() => {
        return Observable.fromArray(Array.from(svg.getElementsByTagName('circle')))
            .map(bullet => {
            return {
                cx: parseFloat(bullet.getAttribute('cx')),
                cy: parseFloat(bullet.getAttribute('cy')),
                bullet: bullet
            };
        })
            .filter(({ cx, cy }) => cx > 600 || cy > 600 || cx < 0 || cy < 0);
    }).subscribe(({ bullet }) => bullet.remove());
    Observable.interval(100).subscribe(() => {
        const transform = g.attr("transform"), xShip = transformMatrix(g).m41, yShip = transformMatrix(g).m42, temp = transform.split("("), angle = degToRad(parseFloat(temp[temp.length - 1].split(")")[0]));
        Observable.fromArray([[-20, -15], [20, -15], [-20, 15], [20, 15]])
            .map(([x, y]) => [xShip + (x * Math.cos(angle) - y * Math.sin(angle)), yShip + (x * Math.sin(angle) + y * Math.cos(angle))])
            .flatMap(([x, y]) => {
            return Observable.fromArray(Array.from(svg.getElementsByTagName('g'))).filter(g => g.getAttribute('id') == 'asteroid').map((asteroid) => {
                const transform = (e) => new WebKitCSSMatrix(window.getComputedStyle(e).webkitTransform);
                return {
                    cx: transform(asteroid).m41,
                    cy: transform(asteroid).m42,
                    asteroid: asteroid
                };
            }).map(({ cx, cy, asteroid }) => {
                const asteroidItem = asteroid.childNodes[0], h = parseFloat(asteroidItem.getAttribute('rx')), v = parseFloat(asteroidItem.getAttribute('ry')), transformA = asteroid.getAttribute('transform'), alpha = degToRad(parseFloat(transformA.split("(")[2].split(")")[0])) + Math.PI / 2, a = (v, h, alpha) => v * v * Math.pow(Math.cos(alpha), 2) + h * h * Math.pow(Math.sin(alpha), 2), yMax = (a, h, v, alpha) => cy + Math.sqrt((-a * h * h * v * v) / (Math.pow(Math.cos(alpha), 2) * Math.pow(Math.sin(alpha), 2) * Math.pow((v * v - h * h), 2) - a * (v * v * Math.pow(Math.sin(alpha), 2) + h * h * Math.pow(Math.cos(alpha), 2)))), yMin = (a, h, v, alpha) => cy - Math.sqrt((-a * h * h * v * v) / (Math.pow(Math.cos(alpha), 2) * Math.pow(Math.sin(alpha), 2) * Math.pow((v * v - h * h), 2) - a * (v * v * Math.pow(Math.sin(alpha), 2) + h * h * Math.pow(Math.cos(alpha), 2)))), xMax = (a, h, v, alpha) => cx + Math.sqrt((-a * h * h * v * v) / (Math.pow(Math.cos(alpha), 2) * Math.pow(Math.sin(alpha), 2) * Math.pow((v * v - h * h), 2) - a * (v * v * Math.pow(Math.cos(alpha), 2) + h * h * Math.pow(Math.sin(alpha), 2)))), xMin = (a, h, v, alpha) => cx - Math.sqrt((-a * h * h * v * v) / (Math.pow(Math.cos(alpha), 2) * Math.pow(Math.sin(alpha), 2) * Math.pow((v * v - h * h), 2) - a * (v * v * Math.pow(Math.cos(alpha), 2) + h * h * Math.pow(Math.sin(alpha), 2))));
                return {
                    yMax: yMax(a(v, h, alpha), h, v, alpha),
                    yMin: yMin(a(v, h, alpha), h, v, alpha),
                    xMax: xMax(a(v, h, alpha), h, v, alpha),
                    xMin: xMin(a(v, h, alpha), h, v, alpha),
                    x: x,
                    y: y,
                    asteroid: asteroid
                };
            }).map(({ yMax, yMin, xMax, xMin, x, y, asteroid }) => {
                return {
                    clash: (x > xMin && x < xMax && y > yMin && y < yMax) || (x > xMax && x < xMin && y > yMax && y < yMin),
                    asteroid: asteroid
                };
            });
        }).filter(({ clash }) => clash)
            .scan(0, (a, { asteroid }) => {
            Observable.fromArray([a]).filter(a => a == 0).subscribe(() => {
                const lifeCounter = document.getElementById('lifeCounter');
                Observable.fromArray([lifeCounter]).filter(lifeCounter => lifeCounter != null).subscribe(lifeCounter => lifeCounter.remove());
                asteroid.remove();
            });
            return a + 1;
        })
            .subscribe(() => {
            const lifeCounter = document.getElementById('lifeCounter');
            Observable.fromArray([lifeCounter]).filter(lifeCounter => lifeCounter == null).subscribe(() => {
                Observable.fromArray([document.getElementById('canvas')]).filter(s => s != null).subscribe(s => {
                    const gameOverTag = document.createElement('p'), allert = document.createTextNode('GAME OVER!!!!!!'), body = document.getElementsByTagName('body').item(0);
                    gameOverTag.setAttribute('style', "font-size:300%; color: rgb(119, 12, 5); font-family: fantasy");
                    gameOverTag.appendChild(allert);
                    body.appendChild(gameOverTag);
                    svg.remove();
                });
            });
        });
    });
    const shooting = Observable.fromEvent(svg, "mousedown")
        .map(() => {
        const gTransform = g.attr("transform"), x = transformMatrix(g).m41, y = transformMatrix(g).m42, temp = gTransform.split("("), angle = parseFloat(temp[temp.length - 1].split(")")[0]), distance = 20, initialX = x + distance * Math.cos(degToRad(angle)), initialY = y + distance * Math.sin(degToRad(angle)), bullet = new Elem(svg, 'circle')
            .attr('cx', initialX.toString())
            .attr('cy', initialY.toString())
            .attr('r', '3')
            .attr('fill', 'DimGray')
            .attr('id', 'bullet');
        return {
            bullet: bullet,
            angle: angle,
            x: x,
            y: y,
            initialX: initialX,
            initialY: initialY
        };
    });
    const movingBullet = shooting.flatMap(({ bullet, angle, x, y, initialX, initialY }) => {
        return Observable.interval(2)
            .takeUntil(Observable.interval(5000))
            .map(e => {
            const distance = 2 * e, dx = initialX + distance * Math.cos(degToRad(angle)), dy = initialY + distance * Math.sin(degToRad(angle));
            return {
                dx: dx,
                dy: dy,
                bullet: bullet.attr('cx', dx.toString()).attr('cy', dy.toString()),
                angle: angle,
                x: x,
                y: y
            };
        });
    });
    const bulletHittingDetection = movingBullet.filter(({ dx, dy }) => (dx < 600 && dy < 600 && dx > 0 && dy > 0)).flatMap(({ dx, dy, bullet, angle, x, y }) => {
        const asteroidGroup = svg.getElementsByTagName('g');
        return Observable.fromArray(Array.from(asteroidGroup))
            .filter(asteroidTransformGroup => asteroidTransformGroup.getAttribute('id') == 'asteroid')
            .map(asteroidTransformGroup => {
            const transformA = asteroidTransformGroup.getAttribute('transform'), tempA = transformA.split("(")[1].split(")")[0].split(" "), asteroidRadius = asteroidTransformGroup.childNodes[0];
            return {
                asteroidAngle: degToRad(parseFloat(transformA.split("(")[2].split(")")[0])) + Math.PI / 2,
                asteroidCx: parseFloat(tempA[0]),
                asteroidCy: parseFloat(tempA[1]),
                asteroidRadius: asteroidRadius,
                asteroidMajorRadius: parseFloat(asteroidRadius.getAttribute('rx')),
                asteroidMinorRadius: parseFloat(asteroidRadius.getAttribute('ry')),
                m: Math.tan(degToRad(angle)),
                b_1: (y - x * Math.tan(degToRad(angle))),
                dx: dx,
                dy: dy,
                bullet: bullet,
                angle: angle,
                x: x,
                y: y,
                asteroidTransformGroup: asteroidTransformGroup
            };
        });
    });
    const intersection = bulletHittingDetection.filter(({ angle }) => angle != 0 && angle != 180).map(({ asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius, m, b_1, dy, dx, bullet, asteroidTransformGroup }) => {
        const bulletProjection = (variableX) => m * variableX + b_1, a = (v, alpha, m, h) => Math.pow(v, 2) * (Math.pow(Math.cos(alpha), 2) + 2 * m * Math.cos(alpha) * Math.sin(alpha) + Math.pow(m, 2) * Math.pow(Math.sin(alpha), 2))
            + Math.pow(h, 2) * (m * m * Math.cos(alpha) * Math.cos(alpha) - 2 * m * Math.cos(alpha) * Math.sin(alpha) + Math.sin(alpha) * Math.sin(alpha)), b = (v, b_1, alpha, m, h) => 2 * v * v * (b_1 + m * asteroidCx - asteroidCy) * (Math.cos(alpha) * Math.sin(alpha) + m * Math.pow(Math.sin(alpha), 2)) + 2 * h * h * (b_1 + m * asteroidCx - asteroidCy) * (m * Math.pow(Math.cos(alpha), 2) - Math.cos(alpha) * Math.sin(alpha)), c = (v, b_1, alpha, m, h) => (b_1 + m * asteroidCx - asteroidCy) * (b_1 + m * asteroidCx - asteroidCy) * (v * v * Math.pow(Math.sin(alpha), 2) + h * h * Math.pow(Math.cos(alpha), 2)) - h * h * v * v;
        const intersectionX_1 = (a, b, c) => (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a) + asteroidCx, intersectionX_2 = (a, b, c) => (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a) + asteroidCx, X_1 = intersectionX_1(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius)), X_2 = intersectionX_2(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius));
        return { X_1: intersectionX_1(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius)),
            Y_1: bulletProjection(X_1),
            X_2: intersectionX_2(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius)),
            Y_2: bulletProjection(X_2),
            asteroidTransformGroup: asteroidTransformGroup,
            dx: dx,
            dy: dy,
            bullet: bullet,
            asteroidAngle: asteroidAngle,
            asteroidCx: asteroidCx,
            asteroidCy: asteroidCy,
            asteroidMajorRadius: asteroidMajorRadius,
            asteroidMinorRadius: asteroidMinorRadius
        };
    })
        .filter(({ X_1, X_2, Y_1, Y_2 }) => X_1 != NaN && X_2 != NaN && Y_1 != NaN && Y_2 != NaN)
        .filter(({ X_1, X_2, Y_1, Y_2, dx, dy }) => dx > X_1 && dx < X_2 && dy > Y_1 && dy < Y_2 ||
        dx > X_2 && dx < X_1 && dy > Y_2 && dy < Y_1 ||
        dx > X_2 && dx < X_1 && dy > Y_1 && dy < Y_2 ||
        dx > X_1 && dx < X_2 && dy > Y_2 && dy < Y_1)
        .filter(({ bullet }) => bullet.elem != null);
    intersection.filter(({ asteroidMajorRadius, asteroidMinorRadius }) => asteroidMajorRadius > 35 || asteroidMinorRadius > 35).subscribe(({ asteroidTransformGroup, bullet, asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius }) => {
        asteroidTransformGroup.remove();
        bullet.elem.remove();
        const point1 = [asteroidCx + asteroidMajorRadius + 10, asteroidCy + asteroidMinorRadius + 10], point2 = [asteroidCx - asteroidMajorRadius - 10, asteroidCy + asteroidMinorRadius + 10], point3 = [asteroidCx - asteroidMajorRadius - 10, asteroidCy - asteroidMinorRadius - 10], point4 = [asteroidCx + asteroidMajorRadius + 10, asteroidCy - asteroidMinorRadius - 10], rotationF = ([x, y]) => [asteroidCx + ((asteroidCx - x) * Math.cos(asteroidAngle) - (asteroidCy - y) * Math.sin(asteroidAngle)), asteroidCy + ((asteroidCx - x) * Math.sin(asteroidAngle) + (asteroidCy - y) * Math.cos(asteroidAngle))], rotatedP1 = rotationF(point1), rotatedP2 = rotationF(point2), rotatedP3 = rotationF(point3), rotatedP4 = rotationF(point4), asteroidGenerator = (point, rotatedAngle) => new Elem(svg, 'g')
            .attr('id', 'asteroid')
            .attr('transform', "translate(" + point[0].toString() + " " + point[1].toString() + ")" +
            "rotate(" + (asteroidAngle + rotatedAngle) + ")")
            .attr('angle', radToDeg(asteroidAngle + rotatedAngle).toString())
            .attr('initialX', point[0].toString())
            .attr('initialY', point[1].toString()), smallAsteroids1 = asteroidGenerator(rotatedP1, 5 * Math.PI / 4), smallAsteroids2 = asteroidGenerator(rotatedP2, 7 * Math.PI / 4), smallAsteroids3 = asteroidGenerator(rotatedP3, Math.PI / 4), smallAsteroids4 = asteroidGenerator(rotatedP4, 3 * Math.PI / 4), ellipseElem = (parent) => new Elem(svg, 'ellipse', parent)
            .attr('cx', "0")
            .attr('cy', "0")
            .attr('rx', (asteroidMajorRadius / 2).toString())
            .attr('ry', (asteroidMinorRadius / 2).toString())
            .attr('fill', 'DimGrey');
        ellipseElem(smallAsteroids1.elem);
        ellipseElem(smallAsteroids2.elem);
        ellipseElem(smallAsteroids3.elem);
        ellipseElem(smallAsteroids4.elem);
        Observable.interval(2).takeUntil(Observable.interval(50000)).flatMap((e) => {
            return Observable.fromArray([smallAsteroids1, smallAsteroids2, smallAsteroids3, smallAsteroids4]).map(asteroid => {
                const levelElement = document.getElementById('level'), level = parseInt(levelElement.textContent), speed = Math.pow(2, level) * 0.1, distance = speed * e;
                return {
                    x: parseFloat(asteroid.attr('initialX')) + distance * Math.cos(degToRad(parseFloat(asteroid.attr('angle')))),
                    y: parseFloat(asteroid.attr('initialY')) + distance * Math.sin(degToRad(parseFloat(asteroid.attr('angle')))),
                    a: asteroid,
                    angle: parseFloat(asteroid.attr('angle'))
                };
            });
        }).subscribe(({ x, y, a, angle }) => a.attr('transform', "translate(" + x.toString() + " " + y.toString() + ")" +
            "rotate(" + angle + ")"));
    });
    intersection.filter(({ asteroidMajorRadius, asteroidMinorRadius }) => asteroidMajorRadius < 35 && asteroidMinorRadius < 35).subscribe(({ asteroidTransformGroup, bullet, asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius }) => {
        asteroidTransformGroup.remove();
        bullet.elem.remove();
        const scoreElement = document.getElementById('score'), score = scoreElement.textContent;
        scoreElement.textContent = (parseInt(score) + 10).toString();
    });
    Observable.interval(2000)
        .flatMap(() => {
        const initialX = Math.random() * 600, initialY = Math.random() * 600, angle = Math.random() * 360, asteroidSizex = Math.random() * 50 + 15, asteroidSizey = Math.random() * 20 + asteroidSizex * 2 / 3, a = new Elem(svg, 'g')
            .attr('id', 'asteroid')
            .attr('transform', "translate(" + initialX.toString() + " " + initialY.toString() + ")" +
            "rotate(" + angle + ")");
        new Elem(svg, 'ellipse', a.elem)
            .attr('cx', "0")
            .attr('cy', "0")
            .attr('rx', asteroidSizex.toString())
            .attr('ry', asteroidSizey.toString())
            .attr('fill', 'DimGrey');
        return Observable.interval(2).takeUntil(Observable.interval(50000))
            .map((e) => {
            const levelElement = document.getElementById('level'), level = parseInt(levelElement.textContent), speed = Math.pow(2, level) * 0.1, distance = speed * e;
            return {
                x: initialX + distance * Math.cos(degToRad(angle)),
                y: initialY + distance * Math.sin(degToRad(angle)),
                a: a,
                angle: angle
            };
        });
    }).subscribe(({ x, y, a, angle }) => {
        a.attr('transform', "translate(" + x.toString() + " " + y.toString() + ")" +
            "rotate(" + angle + ")");
        Observable.interval(50000).subscribe(() => a.elem.remove());
    });
    const asteroidObservable = Observable.interval(10).flatMap(() => {
        return Observable.fromArray(Array.from(svg.getElementsByTagName('g'))).filter(g => g.getAttribute('id') == 'asteroid')
            .map(asteroid => {
            const transform = (e) => new WebKitCSSMatrix(window.getComputedStyle(e).webkitTransform), transformA = asteroid.getAttribute('transform');
            return {
                cx: transform(asteroid).m41,
                cy: transform(asteroid).m42,
                asteroidAngle: parseFloat(transformA.split("(")[2].split(")")[0]),
                asteroid: asteroid
            };
        });
    });
    const asteroidTorusHandler = (newX, newY, asteroid, asteroidAngle) => {
        const a = new Elem(svg, 'g')
            .attr('id', 'asteroid')
            .attr('transform', "translate(" + newX.toString() + " " + newY.toString() + ")" +
            "rotate(" + asteroidAngle + ")"), elem = asteroid.childNodes[0];
        new Elem(svg, 'ellipse', a.elem)
            .attr('cx', "0")
            .attr('cy', "0")
            .attr('rx', elem.getAttribute('rx').toString())
            .attr('ry', elem.getAttribute('ry').toString())
            .attr('fill', 'DimGrey');
        Observable.interval(2).takeUntil(Observable.interval(50000))
            .map((e) => {
            const levelElement = document.getElementById('level'), level = parseInt(levelElement.textContent), speed = Math.pow(2, level) * 0.1, distance = speed * e;
            return {
                x: newX + distance * Math.cos(degToRad(asteroidAngle)),
                y: newY + distance * Math.sin(degToRad(asteroidAngle)),
            };
        }).subscribe(({ x, y }) => a.attr('transform', "translate(" + x.toString() + " " + y.toString() + ")" +
            "rotate(" + asteroidAngle + ")"));
        asteroid.remove();
    };
    asteroidObservable.filter(({ cx }) => cx > 600).subscribe(({ cy, asteroidAngle, asteroid }) => asteroidTorusHandler(0, cy, asteroid, asteroidAngle));
    asteroidObservable.filter(({ cy }) => cy > 600).subscribe(({ cx, asteroidAngle, asteroid }) => asteroidTorusHandler(cx, 0, asteroid, asteroidAngle));
    asteroidObservable.filter(({ cx }) => cx < 0).subscribe(({ cy, asteroidAngle, asteroid }) => asteroidTorusHandler(600, cy, asteroid, asteroidAngle));
    asteroidObservable.filter(({ cy }) => cy < 0).subscribe(({ cx, asteroidAngle, asteroid }) => asteroidTorusHandler(cx, 600, asteroid, asteroidAngle));
    Observable.interval(100).flatMap(() => {
        return Observable.fromArray([document.getElementById('score')]).filter(score => score != null)
            .filter(score => parseInt(score.textContent) % 100 == 0);
    }).subscribe(score => {
        const levelElement = document.getElementById('level'), newLevel = parseInt(score.textContent) / 100 + 1;
        levelElement.textContent = newLevel.toString();
    });
}
if (typeof window != 'undefined')
    window.onload = () => {
        asteroids();
    };
//# sourceMappingURL=asteroids.js.map