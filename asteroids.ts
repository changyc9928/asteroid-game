// FIT2102 2019 Assignment 1
// https://docs.google.com/document/d/1Gr-M6LTU-tfm4yabqZWJYg-zTjEVqHKKTCvePGCYsUA/edit?usp=sharing

function asteroids() {
  // Inside this function you will use the classes and functions 
  // defined in svgelement.ts and observable.ts
  // to add visuals to the svg element in asteroids.html, animate them, and make them interactive.
  // Study and complete the Observable tasks in the week 4 tutorial worksheet first to get ideas.

  // You will be marked on your functional programming style
  // as well as the functionality that you implement.
  // Document your code!  
  // Explain which ideas you have used ideas from the lectures to 
  // create reusable, generic functions.
  const svg = document.getElementById("canvas")!;
  // make a group for the spaceship and a transform to move it and rotate it
  // to animate the spaceship you will update the transform property
  let g = new Elem(svg,'g')
    .attr("transform","translate(300 300)")
    .attr("speed", "1");  
  
  // create a polygon shape for the space ship as a child of the transform group
  let ship = new Elem(svg, 'polygon', g.elem) 
    .attr("points","-15,20 15,20 0,-20")
    .attr("style","fill:lime;stroke:purple;stroke-width:1");

  // Convert radians to degrees. +90deg at the end because the ship sesat in wrong direction
  const radToDeg = (rad:number) => rad * 180 / Math.PI + 90,
        degToRad = (deg: number) => deg * Math.PI / 180 - (Math.PI/2);

  // Function that gets the current transform property of the given Elem
  // I did not use g.elem.getboundingClientRect() because that changes the x,y after rotation
  const transformMatrix = 
    (e:Elem) => new WebKitCSSMatrix(window.getComputedStyle(e.elem).webkitTransform);

  // Subscribe mousemove event on the svg canvas
  Observable.fromEvent<MouseEvent>(svg, "mousemove")
    // Calculate current pointer position relative to the canvas
    .map(({clientX, clientY}) => {
      const
        lookx = clientX - svg.getBoundingClientRect().left,
        looky = clientY - svg.getBoundingClientRect().top,
        x = transformMatrix(g).m41, // m41 is transformX in the Webkit CSS Matrix
        y = transformMatrix(g).m42  // m42 is transformY in the Webkit CSS Matrix
      return {
      // lookx: clientX - svg.getBoundingClientRect().left,
      // looky: clientY - svg.getBoundingClientRect().top,
      x: transformMatrix(g).m41, // m41 is transformX in the Webkit CSS Matrix
      y: transformMatrix(g).m42,  // m42 is transformY in the Webkit CSS Matrix
      angle: radToDeg(Math.atan2(looky - y, lookx - x))
    }}).filter(({angle}) => angle != 0 && angle != 180) // to make sure the ship is not vertical because my bullet collision detection is not working if the bullet is shot vertically
    .map(({x, y, angle}) => 
      // Used alot in games to get rotation in radians: Math.atan2(looky - y, lookx - x)
      g.attr("transform",
        "translate(" + x + " " + y + ")" +
        "rotate(" + angle + ")"))
    .subscribe(_ => _);

  // Collect the information of ship when keydown event fires
  // branching this observable out and pass to 4 different children for 4 different keys: "w", "a", "s" and "d"
  const keydown = Observable.fromEvent<KeyboardEvent>(document, "keydown")
    .map(e => {
      const 
        transform = g.attr("transform"),
        x = transformMatrix(g).m41, y = transformMatrix(g).m42,
        distance = 8,  // constant speed of 8 pixel per press
        temp = transform.split("("),
        angle = parseFloat(temp[temp.length - 1].split(")")[0]);  // getting angle of the ship by splitting
      return {
        e: e,
        y: y,
        x: x,
        distance: distance,
        angle: angle
      };
    });

  // observe keydown for key w
  const keyW = keydown.filter(({e}) => e.key == "w")
    .map(({e, y, x, angle}) => {
      const 
        // instead of getting the constant speed of 8, I use the speed attribute added to the ship to move it
        distance = parseFloat(g.attr("speed")),
        // (dx, dy) is the next position of the ship when keydown fires, calculating by some maths
        dx = x + distance * Math.cos(degToRad(angle)), dy = y + distance * Math.sin(degToRad(angle));
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

  // subscribe and move the ship by changing the ship attributes, increasing the speed by 0.2 pixel per press per press
  keyW.subscribe(({dx, dy, angle, distance}) =>
    g.attr("transform",
          "translate(" + dx + " " + dy + ")" +
          "rotate(" + angle + ")").attr('speed', (distance + 0.5).toString()));

  // when w is lifted, start decraesing the speed of the ship and keep moving it until the speed is back to original speed
  const braking = Observable.fromEvent<KeyboardEvent>(document, "keyup").filter(e => e.key == "w")
  .flatMap(e => {
    // for every 0.03s, move the ship with current speed
    // and decrese the speed by 1 pixel per press per 0.03s at the same time
    // take until next key "w" is pressed
    return Observable.interval(30).takeUntil(keyW).filter(() => parseFloat(g.attr('speed')) >= 1.5).map(e => {
      const
        transform = g.attr("transform"),
        x = transformMatrix(g).m41, y = transformMatrix(g).m42,
        distance = parseFloat(g.attr("speed")),
        temp = transform.split("("),
        // below are the same logic as the keydown observable
        angle = parseFloat(temp[temp.length - 1].split(")")[0]),
        dx = x + distance * Math.cos(degToRad(angle)), dy = y + distance * Math.sin(degToRad(angle));
      return {
        dx: dx,
        dy: dy,
        angle: angle,
        distance: distance
      };
    });
  });

  // subscribe to move the ship
  braking.subscribe(({dx, dy, angle, distance}) => 
    g.attr("transform",
          "translate(" + dx + " " + dy + ")" +
          // decrease the speed by 1 pixel per press per 0.03s
          "rotate(" + angle + ")").attr('speed', (distance - 1).toString()));

  // filter "s" key calculate the backward position of the ship should go
  const keyS = keydown
    .filter(({e}) => e.key == "s").map(({y, x, distance, angle}) => {
      const
        // calculate next position of the ship using constant speed, math equation same as above
        dx = x - distance * Math.cos(degToRad(angle)), dy = y - distance * Math.sin(degToRad(angle));
      return {
        dx: dx,
        dy: dy,
        angle: angle
      };
  });

  // subscribe and move the ship by changing the ship attributes with constant speed of 8 pixel per press
  keyS.subscribe(({dx, dy, angle}) =>
    g.attr("transform",
          "translate(" + dx + " " + dy + ")" +
          "rotate(" + angle + ")"));
      
  // filter "a" key calculate the left position of the ship should pan
  const keyA = keydown
    .filter(({e}) => e.key == "a").map(({y, x, distance, angle}) => {
      const
        // constant speed calculation as above
        dx = x - distance * Math.cos(degToRad(angle) + Math.PI / 2), dy = y - distance * Math.sin(degToRad(angle) + Math.PI / 2);
      return {
        dx: dx,
        dy: dy,
        angle: angle
      };
  });

  // subscribe and move the ship by changing the ship attributes
  keyA.subscribe(({dx, dy, angle}) =>
    g.attr("transform",
          "translate(" + dx + " " + dy + ")" +
          "rotate(" + angle + ")"));

  // filter "d" key calculate the right position of the ship should pan
  const keyD = keydown
    .filter(({e}) => e.key == "d").map(({y, x, distance, angle}) => {
      const
        // using constant speed
        dx = x + distance * Math.cos(degToRad(angle) + Math.PI / 2), dy = y + distance * Math.sin(degToRad(angle) + Math.PI / 2);
      return {
        dx: dx,
        dy: dy,
        angle: angle
      };
  });

  // subscribe and move the ship by changing the ship attributes
  keyD.subscribe(({dx, dy, angle}) =>
    g.attr("transform",
          "translate(" + dx + " " + dy + ")" +
          "rotate(" + angle + ")"));
      
  // helper function to check if the ship is out of bounds, implementing the torus topology
  // because there are 4 keys to press plus the braking system, if not using a reusable function,
  // the code will be duplicated 5 times, which is very superfluous
  const outOfBound = (observable: Observable<{dx: number, dy: number, angle: number}>) => {
    // if x-coordinate of next position of the ship is > 600, change x to 0
    observable.filter(({dx}) => dx > 600).subscribe(({dy, angle}) => 
      g.attr("transform",
            "translate(" + 0 + " " + dy + ")" +
            "rotate(" + angle + ")"));

    // if x-coordinate of next position of the ship is < 0, change x to 600
    observable.filter(({dx}) => dx < 0).subscribe(({dy, angle}) => 
      g.attr("transform",
            "translate(" + 600 + " " + dy + ")" +
            "rotate(" + angle + ")"));
    
    // if y-coordinate of next position of the ship is > 600, change y to 0
    observable.filter(({dy}) => dy > 600).subscribe(({dx, angle}) => 
      g.attr("transform",
            "translate(" + dx + " " + 0 + ")" +
            "rotate(" + angle + ")"));

    // if y-coordinate of next position of the ship is < 0, change y to 0
    observable.filter(({dy}) => dy < 0).subscribe(({dx, angle}) => 
      g.attr("transform",
            "translate(" + dx + " " + 600 + ")" +
            "rotate(" + angle + ")"));
  };

  // pass in all the observables of all WASD keys and braking to apply torus topology for the ship
  outOfBound(keyW);
  outOfBound(keyA);
  outOfBound(keyS);
  outOfBound(keyD);
  outOfBound(braking);

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // remove the bullet if it is out of the canvas, to make the program smoother
  Observable.interval(10).flatMap(() => {
    // get all the bullets by using tag of "circle"
    return Observable.fromArray(Array.from(svg.getElementsByTagName('circle')))
    .map(bullet => {
      return {
        cx: parseFloat(<string>bullet.getAttribute('cx')),
        cy: parseFloat(<string>bullet.getAttribute('cy')),
        bullet: bullet
      };
    })
    // filter them out, if out of bounds, remove the SVGElement
    .filter(({cx, cy}) => cx > 600 || cy > 600 || cx < 0 || cy < 0)
  }).subscribe(({bullet}) => bullet.remove());

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // check condition of the ship by calculating the bounding boxes of the ship and asteroids, if their bounding boxes overlapping, remove one life, if all life has been used, end the game.
  Observable.interval(100).subscribe(() => {
    const
      // retrieve all the informations of the ship
      transform = g.attr("transform"),
      xShip = transformMatrix(g).m41, yShip = transformMatrix(g).m42,
      temp = transform.split("("),
      angle = degToRad(parseFloat(temp[temp.length - 1].split(")")[0]));
      // calculate the 4 bounding points of the ship (maxX, maxY, minX, minY)
      // [-20, -15], [20, -15], [-20, 15], [20, 15] is the preset values of the dimension of the ship
      Observable.fromArray([[-20, -15], [20, -15], [-20, 15], [20, 15]])
        // map the coordinates in 0 degree into rotated coordinates using rotation matrix multiplication
        // rotation matrix reference: https://en.wikipedia.org/wiki/Rotation_matrix
        .map(([x, y]) => [xShip + (x*Math.cos(angle) - y*Math.sin(angle)), yShip + (x*Math.sin(angle) + y*Math.cos(angle))])
        .flatMap(([x, y]) => {
          // observe all the asteroids
          return Observable.fromArray(Array.from(svg.getElementsByTagName('g'))).filter(g => g.getAttribute('id') == 'asteroid').map((asteroid) => {
            const
              transform = (e: SVGElement) => new WebKitCSSMatrix(window.getComputedStyle(e).webkitTransform);
            // return the information of all asteroids
            return {
              cx: transform(asteroid).m41,
              cy: transform(asteroid).m42,
              asteroid: asteroid
            };
          }).map(({cx, cy, asteroid}) => {
            const
              // calculate the bounding box of the rotated asteroids in 0 degree
              // h = ellipse major radius, v = ellipse minor radius, alpha = ellipse rotation angle, a = quadratic equation constant
              // (cx, cy) = the coordinate of the centre of the asteroids
              asteroidItem = <SVGElement>asteroid.childNodes[0],
              h = parseFloat(<string>asteroidItem.getAttribute('rx')),
              v = parseFloat(<string>asteroidItem.getAttribute('ry')),
              transformA = <string>asteroid.getAttribute('transform'),
              alpha = degToRad(parseFloat(transformA.split("(")[2].split(")")[0])) + Math.PI/2,
              a = (v: number, h: number, alpha: number) => v*v*Math.pow(Math.cos(alpha), 2) + h*h*Math.pow(Math.sin(alpha), 2),
              yMax = (a: number, h: number, v: number, alpha: number) => cy + Math.sqrt((-a*h*h*v*v)/(Math.pow(Math.cos(alpha), 2)*Math.pow(Math.sin(alpha), 2)*Math.pow((v*v - h*h), 2) - a*(v*v*Math.pow(Math.sin(alpha), 2) + h*h*Math.pow(Math.cos(alpha), 2)))),
              yMin = (a: number, h: number, v: number, alpha: number) => cy - Math.sqrt((-a*h*h*v*v)/(Math.pow(Math.cos(alpha), 2)*Math.pow(Math.sin(alpha), 2)*Math.pow((v*v - h*h), 2) - a*(v*v*Math.pow(Math.sin(alpha), 2) + h*h*Math.pow(Math.cos(alpha), 2)))),
              xMax = (a: number, h: number, v: number, alpha: number) => cx + Math.sqrt((-a*h*h*v*v)/(Math.pow(Math.cos(alpha), 2)*Math.pow(Math.sin(alpha), 2)*Math.pow((v*v - h*h), 2) - a*(v*v*Math.pow(Math.cos(alpha), 2) + h*h*Math.pow(Math.sin(alpha), 2)))),
              xMin = (a: number, h: number, v: number, alpha: number) => cx - Math.sqrt((-a*h*h*v*v)/(Math.pow(Math.cos(alpha), 2)*Math.pow(Math.sin(alpha), 2)*Math.pow((v*v - h*h), 2) - a*(v*v*Math.pow(Math.cos(alpha), 2) + h*h*Math.pow(Math.sin(alpha), 2))));
              return {
                yMax: yMax(a(v, h, alpha), h, v, alpha),
                yMin: yMin(a(v, h, alpha), h, v, alpha),
                xMax: xMax(a(v, h, alpha), h, v, alpha),
                xMin: xMin(a(v, h, alpha), h, v, alpha),
                x: x,
                y: y,
                asteroid: asteroid
              };
          }).map(({yMax, yMin, xMax, xMin, x, y, asteroid}) => {
            return {
              // map the ship bounding points into boolean which indicates the condition of overlapping of each bounding points with bounding box of asteroid
              clash: (x > xMin && x < xMax && y > yMin && y < yMax) || (x > xMax && x < xMin && y > yMax && y < yMin),
              asteroid: asteroid
            };
          });
        }).filter(({clash}) => clash)
        // filter out if there is one overlapping point
        .scan(0, (a, {asteroid}) => {
          // decrement the life of ship with ONLY one time
          Observable.fromArray([a]).filter(a => a == 0).subscribe(() => {
            const
              lifeCounter = <HTMLElement>document.getElementById('lifeCounter');
            // only if there is at least one life, decreament the life
            Observable.fromArray([lifeCounter]).filter(lifeCounter => lifeCounter != null).subscribe(lifeCounter => lifeCounter.remove());
            // remove the colliding asteroid because the ship won't spawn at a new position, if the asteroid is not removed, this observable will always triggered
            asteroid.remove();
          });
          // loop position counter
          return a + 1;
        })
        .subscribe(() => {
          const
            // get the life count
            lifeCounter = <HTMLElement>document.getElementById('lifeCounter');
          // if the life is currently null, end the game
          Observable.fromArray([lifeCounter]).filter(lifeCounter => lifeCounter == null).subscribe(() => {
            // if there is "canvas", remove the "canvas"
            Observable.fromArray([document.getElementById('canvas')]).filter(s => s != null).subscribe(s => {
              const
                // create "game over" HTML element
                gameOverTag = document.createElement('p'),
                allert = document.createTextNode('GAME OVER!!!!!!'),
                body = <HTMLBodyElement>document.getElementsByTagName('body').item(0);
              gameOverTag.setAttribute('style', "font-size:300%; color: rgb(119, 12, 5); font-family: fantasy");
              gameOverTag.appendChild(allert);
              body.appendChild(gameOverTag);
              // remove the game
              svg.remove();
            });
          });
        });
  })

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // shooting observable, create a new bullet when mousedown happens
  const shooting = Observable.fromEvent<MouseEvent>(svg, "mousedown")
    .map(() => {
      const 
        gTransform = g.attr("transform"),
        x = transformMatrix(g).m41, y = transformMatrix(g).m42,
        temp = gTransform.split("("),
        angle = parseFloat(temp[temp.length - 1].split(")")[0]),
        // distance = 20 because the ship head is 20 (actually is to the right) above of its origin point
        distance = 20,
        // calculate the position of the "ship head"
        initialX = x + distance * Math.cos(degToRad(angle)), initialY = y + distance * Math.sin(degToRad(angle)),
        // create a new bullet when mouse clicked
        bullet = new Elem(svg, 'circle')
                  .attr('cx', initialX.toString())
                  .attr('cy', initialY.toString())
                  .attr('r', '3')
                  .attr('fill', 'DimGray')
                  .attr('id', 'bullet')
      // return necessary information
      return {
              bullet: bullet,
              angle: angle,
              x: x,
              y: y,
              initialX: initialX,
              initialY: initialY
            };
    })

  // move the bullet, with a constant speed of 2 pixels per observable loop fires
  const movingBullet = shooting.flatMap(({bullet, angle, x, y, initialX, initialY}) => {
      return Observable.interval(2)
        // life of every bullet is 5s
        .takeUntil(Observable.interval(5000))
        .map(e => {
          const
            // speed of the bullet is 2 pixels per 2ms
            distance = 2 * e,
            // for every 2ms, calculate the next position of the bullet relative to its initial position
            dx = initialX + distance * Math.cos(degToRad(angle)),
            dy = initialY + distance * Math.sin(degToRad(angle));
          return {
            dx: dx,
            dy: dy,
            bullet: bullet.attr('cx', dx.toString()).attr('cy', dy.toString()),
            angle: angle,
            x: x,
            y: y
          }
        })
  })

  // retrieve the informations of all asteroids present on the HTML, keep tracking all of them when the bullet is moving, i.e. 2ms per check
  const bulletHittingDetection = movingBullet.filter(({dx, dy}) => (dx < 600 && dy < 600 && dx > 0 && dy > 0)).flatMap(({dx, dy, bullet, angle, x, y}: {dx: number, dy: number, bullet: Elem, angle: number, x: number, y: number}) => {
    const 
      asteroidGroup = svg.getElementsByTagName('g');
    return Observable.fromArray(Array.from(asteroidGroup))
      .filter(asteroidTransformGroup => asteroidTransformGroup.getAttribute('id') == 'asteroid')
      // return the information of all asteroids
      .map(asteroidTransformGroup => {
        const
          transformA = <string>asteroidTransformGroup.getAttribute('transform'),
          tempA = transformA.split("(")[1].split(")")[0].split(" "),
          asteroidRadius = <SVGElement>asteroidTransformGroup.childNodes[0];
          return {
            asteroidAngle: degToRad(parseFloat(transformA.split("(")[2].split(")")[0])) + Math.PI/2,
            asteroidCx: parseFloat(tempA[0]), 
            asteroidCy: parseFloat(tempA[1]),
            asteroidRadius: asteroidRadius,
            asteroidMajorRadius: parseFloat(<string>asteroidRadius.getAttribute('rx')),
            asteroidMinorRadius: parseFloat(<string>asteroidRadius.getAttribute('ry')),
            // m = gradient of bullet shooting projecion
            m: Math.tan(degToRad(angle)),
            // b_1 = y-intercept of the bullet projection
            b_1: (y - x*Math.tan(degToRad(angle))),
            // (dx, dy) = next position of the bullet
            dx: dx,
            dy: dy,
            bullet: bullet,
            // angle = bullet shooting angle
            angle: angle,
            x: x,
            y: y,
            asteroidTransformGroup: asteroidTransformGroup
        }
        })
  })

  // calculate the bullet projection and the boundary of ellipse (asteroids), find their intersection
  // filter the bullet which its coordinate is between 2 intersection points
  const intersection = bulletHittingDetection.filter(({angle}: {angle: number}) => angle != 0 && angle != 180).map(({asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius, m, b_1, dy, dx, bullet, asteroidTransformGroup}) => {
    const
      // bullet projection = straight line equation: y = mx + b_1
      bulletProjection = (variableX: number) => m*variableX + b_1,
      // I've simplified the intersection simultaneous equation into quadratic equation
      // source: http://quickcalcbasic.com/ellipse%20line%20intersection.pdf
      // a, b and c are the quadratic equation terms: ax^2 + bx + c = 0
      a = (v: number, alpha: number, m: number, h: number) => Math.pow(v, 2)*(Math.pow(Math.cos(alpha), 2) + 2*m*Math.cos(alpha)*Math.sin(alpha) + Math.pow(m, 2)*Math.pow(Math.sin(alpha), 2))
        + Math.pow(h, 2)*(m*m*Math.cos(alpha)*Math.cos(alpha) - 2*m*Math.cos(alpha)*Math.sin(alpha) + Math.sin(alpha)*Math.sin(alpha)),
      b = (v: number, b_1: number, alpha: number, m: number, h: number) => 2 * v * v * (b_1 + m*asteroidCx - asteroidCy) * (Math.cos(alpha) * Math.sin(alpha) + m*Math.pow(Math.sin(alpha), 2)) + 2*h*h*(b_1 + m*asteroidCx - asteroidCy)*(m*Math.pow(Math.cos(alpha), 2) - Math.cos(alpha)*Math.sin(alpha)),
      c = (v: number, b_1: number, alpha: number, m: number, h: number) => (b_1 + m*asteroidCx - asteroidCy)*(b_1 + m*asteroidCx - asteroidCy)*(v*v*Math.pow(Math.sin(alpha), 2) + h*h*Math.pow(Math.cos(alpha), 2)) - h*h*v*v;
    // below is the quadratic equation of vertical bullet projection version, the above equation won't work for vertical lines
    // but I won't use it here because this will cause bullet duplication if branching the observable to another child using filter()
    // instead, I prevent the ship to be exact 0 and 180 degree in the ship rotation obsrvable
    // if(angle == 0 || angle == 180) {
    //   let
    //     a = (v: number, alpha: number, h: number) => Math.pow(v, 2)*Math.pow(Math.sin(alpha), 2) + Math.pow(h, 2)*Math.pow(Math.cos(alpha), 2),
    //     b = (x: number, alpha: number, v: number, h: number) => 2*x*Math.cos(alpha)*Math.sin(alpha)*(Math.pow(v, 2)- Math.pow(h, 2)),
    //     c = (x: number, alpha: number, v: number, h: number) => Math.pow(x, 2) * (Math.pow(v, 2)*Math.pow(Math.cos(alpha), 2) + Math.pow(h, 2)*Math.pow(Math.sin(alpha), 2)) - Math.pow(h, 2)*Math.pow(v, 2)
    // }
    const
      // calculate the x-coordinates of 2 intersection points: x = (-b +- sqrt(b^2-4ac))/2a relative to origin
      intersectionX_1 = (a:number, b:number, c:number) => (-b + Math.sqrt(b*b - 4*a*c)) / (2*a) + asteroidCx,
      intersectionX_2 = (a:number, b:number, c:number) => (-b - Math.sqrt(b*b - 4*a*c)) / (2*a) + asteroidCx,
      X_1 = intersectionX_1(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius)),
      X_2 = intersectionX_2(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius))
      return {X_1: intersectionX_1(a(asteroidMinorRadius, asteroidAngle, m, asteroidMajorRadius), b(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius), c(asteroidMinorRadius, b_1, asteroidAngle, m, asteroidMajorRadius)),
              // calculate y-coordinate by substituting the x-coordinate into bullet projection equation
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
    // filter if the bullet projection is intersecting with asteroid
    .filter(({X_1, X_2, Y_1, Y_2}) => X_1 != NaN && X_2!= NaN && Y_1!= NaN && Y_2!= NaN)
    // filter if the actual bullet coodinate is within the range of (xMax, yMax) and (xMin, yMin)
    .filter(({X_1, X_2, Y_1, Y_2, dx, dy}) => 
      dx > X_1 && dx < X_2 && dy > Y_1 && dy < Y_2 ||
      dx > X_2 && dx < X_1 && dy > Y_2 && dy < Y_1 ||
      dx > X_2 && dx < X_1 && dy > Y_1 && dy < Y_2 ||
      dx > X_1 && dx < X_2 && dy > Y_2 && dy < Y_1)
    // filter if the bullet has not removed yet
    .filter(({bullet}) => bullet.elem != null)

  // if the asteroid is big, partition it into 4 by creating 4 new asteroids and remove the big one
  intersection.filter(({asteroidMajorRadius, asteroidMinorRadius}) => asteroidMajorRadius > 35 || asteroidMinorRadius > 35).subscribe(({asteroidTransformGroup, bullet, asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius}) => {
    // remove both large asteroid and bullet
    asteroidTransformGroup.remove();
    bullet.elem.remove();
    const 
      // calculate the positions of 4 new small asteroids
      point1 = [asteroidCx+asteroidMajorRadius+10, asteroidCy+asteroidMinorRadius+10],
      point2 = [asteroidCx-asteroidMajorRadius-10, asteroidCy+asteroidMinorRadius+10],
      point3 = [asteroidCx-asteroidMajorRadius-10, asteroidCy-asteroidMinorRadius-10],
      point4 = [asteroidCx+asteroidMajorRadius+10, asteroidCy-asteroidMinorRadius-10],
      // reusable function to calculate the rotated positions of 4 new postions
      // using the above rotation matrix as well
      rotationF = ([x, y]: number[]) => [asteroidCx + ((asteroidCx - x)*Math.cos(asteroidAngle) - (asteroidCy - y)*Math.sin(asteroidAngle)), asteroidCy + ((asteroidCx - x)*Math.sin(asteroidAngle) + (asteroidCy - y)*Math.cos(asteroidAngle))],
      // pass in all the 4 points to get rotated points
      rotatedP1 = rotationF(point1),
      rotatedP2 = rotationF(point2),
      rotatedP3 = rotationF(point3),
      rotatedP4 = rotationF(point4),
      // asteroid generator function to generate asteroids
      asteroidGenerator = (point: number[], rotatedAngle: number) => new Elem(svg, 'g')
        .attr('id', 'asteroid')
        .attr('transform', 
              "translate("+ point[0].toString() + " " + point[1].toString() + ")" +
              "rotate(" + (asteroidAngle + rotatedAngle) + ")")
        .attr('angle', radToDeg(asteroidAngle + rotatedAngle).toString())
        .attr('initialX', point[0].toString())
        .attr('initialY', point[1].toString()),
      // generate 4 new asteroid parent groups
      smallAsteroids1 = asteroidGenerator(rotatedP1, 5*Math.PI/4), 
      smallAsteroids2 = asteroidGenerator(rotatedP2, 7*Math.PI/4),
      smallAsteroids3 = asteroidGenerator(rotatedP3, Math.PI/4),
      smallAsteroids4 = asteroidGenerator(rotatedP4, 3*Math.PI/4),
      // ellipse shape geneator function to generate small ellipses
      ellipseElem = (parent: Element) =>     
        new Elem(svg, 'ellipse', parent)
                .attr('cx', "0")
                .attr('cy', "0")
                .attr('rx', (asteroidMajorRadius/2).toString())
                .attr('ry', (asteroidMinorRadius/2).toString())
                .attr('fill', 'DimGrey');
    // generate 4 ellipse shapes
    ellipseElem(smallAsteroids1.elem);
    ellipseElem(smallAsteroids2.elem);
    ellipseElem(smallAsteroids3.elem);
    ellipseElem(smallAsteroids4.elem);
    // observable to make the small asteroids move
    Observable.interval(2).takeUntil(Observable.interval(50000)).flatMap((e) => {
      // for every 2ms, move all 4 small asteroids with the same logic as bullet moving mechanics
      return Observable.fromArray([smallAsteroids1, smallAsteroids2, smallAsteroids3, smallAsteroids4]).map(asteroid => {
        const
          levelElement = document.getElementById('level'),
          level = parseInt(<string>(<HTMLElement>levelElement).textContent),
          speed = Math.pow(2, level) * 0.1,
          distance = speed * e;
        return {
          x: parseFloat(<string>asteroid.attr('initialX')) + distance * Math.cos(degToRad(parseFloat(<string>asteroid.attr('angle')))), 
          y: parseFloat(<string>asteroid.attr('initialY')) + distance * Math.sin(degToRad(parseFloat(<string>asteroid.attr('angle')))),
          a: asteroid,
          angle: parseFloat(<string>asteroid.attr('angle'))
        }
      })
    }).subscribe(({x, y, a, angle}) => 
    a.attr('transform', 
            "translate("+ x.toString() + " " + y.toString() + ")" +
            "rotate(" + angle + ")"))
  });
  
  // if the asteroid is small, just remove it and increment the score
  intersection.filter(({asteroidMajorRadius, asteroidMinorRadius}) => asteroidMajorRadius < 35 && asteroidMinorRadius < 35).subscribe(({asteroidTransformGroup, bullet, asteroidAngle, asteroidCx, asteroidCy, asteroidMajorRadius, asteroidMinorRadius}) => {
          asteroidTransformGroup.remove();
          bullet.elem.remove();
          const 
            scoreElement = <HTMLElement>document.getElementById('score'),
            score = <string>scoreElement.textContent;
          scoreElement.textContent = (parseInt(score) + 10).toString();
  });

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // Observable to spawn asteroids every 2 seconds
  Observable.interval(2000)
    .flatMap(() => {
      const 
        // coordinates and rotation angles are random generated
        initialX = Math.random() * 600, 
        initialY = Math.random() * 600, 
        angle = Math.random() * 360,
        asteroidSizex = Math.random() * 50 + 15,
        asteroidSizey = Math.random() * 20 + asteroidSizex * 2 / 3,
        a = new Elem(svg, 'g')
          .attr('id', 'asteroid')
          .attr('transform', 
              "translate("+ initialX.toString() + " " + initialY.toString() + ")" +
              "rotate(" + angle + ")");
        new Elem(svg, 'ellipse', a.elem)
          .attr('cx', "0")
          .attr('cy', "0")
          .attr('rx', asteroidSizex.toString())
          .attr('ry', asteroidSizey.toString())
          .attr('fill', 'DimGrey');
      // when asteroid is created, give it a life span of 50 seconds and move it every 2 ms
      // moving mechanic is the same as the ship movement algorithm
      return Observable.interval(2).takeUntil(Observable.interval(50000))
        .map((e) => {
          const
            levelElement = document.getElementById('level'),
            level = parseInt(<string>(<HTMLElement>levelElement).textContent),
            speed = Math.pow(2, level) * 0.1,
            distance = speed * e;
            return {
              x: initialX + distance * Math.cos(degToRad(angle)), 
              y: initialY + distance * Math.sin(degToRad(angle)),
              a: a,
              angle: angle
            }
          })
    }).subscribe(({x, y, a, angle}) => {
      a.attr('transform', 
              "translate("+ x.toString() + " " + y.toString() + ")" +
              "rotate(" + angle + ")");
      // life of each asteroid is 50 seconds
      Observable.interval(50000).subscribe(() => a.elem.remove());
    })

  // keep tracking of all asteroids every 10ms
  const asteroidObservable = Observable.interval(10).flatMap(() => {
    return Observable.fromArray(Array.from(svg.getElementsByTagName('g'))).filter(g => g.getAttribute('id') == 'asteroid')
    .map(asteroid => {
      const
        transform = (e: SVGElement) => new WebKitCSSMatrix(window.getComputedStyle(e).webkitTransform),
        transformA = <string>asteroid.getAttribute('transform');
      return {
        cx: transform(asteroid).m41,
        cy: transform(asteroid).m42,
        asteroidAngle: parseFloat(transformA.split("(")[2].split(")")[0]),
        asteroid: asteroid
      }
    })
  })
                
  // a function to apply torus topology to asteroids by removing the old asteroids and generating new asteroid with same attributes at another sides of the canvas
  const asteroidTorusHandler = (newX: number, newY: number, asteroid: SVGElement, asteroidAngle: number) => {
    const a = new Elem(svg, 'g')
    .attr('id', 'asteroid')
    .attr('transform',  
          "translate("+ newX.toString() + " " + newY.toString() + ")" +
          "rotate(" + asteroidAngle + ")"),
    elem = <SVGElement>asteroid.childNodes[0]
    new Elem(svg, 'ellipse', a.elem)
      .attr('cx', "0")
      .attr('cy', "0")
      .attr('rx', (<string>elem.getAttribute('rx')).toString())
      .attr('ry', (<string>elem.getAttribute('ry')).toString())
      .attr('fill', 'DimGrey');
    Observable.interval(2).takeUntil(Observable.interval(50000))
      .map((e) => {
        const
          levelElement = <HTMLElement>document.getElementById('level'),
          level = parseInt(<string>levelElement.textContent),
          speed = Math.pow(2, level) * 0.1,
          distance = speed * e;
          return {
            x: newX + distance * Math.cos(degToRad(asteroidAngle)), 
            y: newY + distance * Math.sin(degToRad(asteroidAngle)),
          }
        }).subscribe(({x, y}) => a.attr('transform',  
        "translate("+ x.toString() + " " + y.toString() + ")" +
        "rotate(" + asteroidAngle + ")"),)
    asteroid.remove()
  }

  // handle the asteroids if their x coordinate > 600
  asteroidObservable.filter(({cx}) => cx > 600).subscribe(({cy, asteroidAngle, asteroid}) => asteroidTorusHandler(0, cy, asteroid, asteroidAngle));
    
  // handle the asteroids if their y coordinate > 600
  asteroidObservable.filter(({cy}) => cy > 600).subscribe(({cx, asteroidAngle, asteroid}) => asteroidTorusHandler(cx, 0, asteroid, asteroidAngle));

  // handle the asteroids if their x coordinate < 0
  asteroidObservable.filter(({cx}) => cx < 0).subscribe(({cy, asteroidAngle, asteroid}) => asteroidTorusHandler(600, cy, asteroid, asteroidAngle));

  // handle the asteroids if their y coordinate < 0
  asteroidObservable.filter(({cy}) => cy < 0).subscribe(({cx, asteroidAngle, asteroid}) => asteroidTorusHandler(cx, 600, asteroid, asteroidAngle));

  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // ---------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // keep track of the score every 0.1s, if the score is detected to be multiple of 100, increase the level
  Observable.interval(100).flatMap(() => {
    return Observable.fromArray([document.getElementById('score')]).filter(score => score != null)
    .filter(score => parseInt(<string>(<HTMLElement>score).textContent) % 100 == 0)
  }).subscribe(score => {
    const 
      levelElement = <HTMLElement>document.getElementById('level'),
      newLevel = parseInt(<string>(<HTMLElement>score).textContent) / 100 + 1
    levelElement.textContent = newLevel.toString();
  })
}

// the following simply runs your asteroids function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = ()=>{
    asteroids();
  }
