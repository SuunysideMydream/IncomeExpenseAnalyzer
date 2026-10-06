gsap.registerPlugin(MorphSVGPlugin);

document.querySelectorAll('.checkbox').forEach(element => {

    let path = element.querySelector('path'),
        input = element.querySelector('input')

    element.addEventListener('pointerdown', e => {
        if(element.classList.contains('active')) {
            return
        }
        gsap.to(path, {
            morphSVG: 'M3.76792 8.316C3.29262 5.68859 5.68858 3.29262 8.316 3.76792C10.2859 4.12429 12.3921 4.41667 14 4.41667C15.6079 4.41667 17.7141 4.12429 19.684 3.76792C22.3114 3.29262 24.7074 5.68858 24.2321 8.316C23.8757 10.2859 23.5833 12.3921 23.5833 14C23.5833 15.6079 23.8757 17.7141 24.2321 19.684C24.7074 22.3114 22.3114 24.7074 19.684 24.2321C17.7141 23.8757 15.6079 23.5833 14 23.5833C12.3921 23.5833 10.2859 23.8757 8.316 24.2321C5.68859 24.7074 3.29262 22.3114 3.76792 19.684C4.12429 17.7141 4.41667 15.6079 4.41667 14C4.41667 12.3921 4.12429 10.2859 3.76792 8.316Z',
            duration: .15
        })
    })

    element.addEventListener('click', e => {

        if(element.classList.contains('active')) {
            return
        }

        element.classList.add('active')

        gsap.fromTo(path, {
            morphSVG: 'M3.76792 8.316C3.29262 5.68859 5.68858 3.29262 8.316 3.76792C10.2859 4.12429 12.3921 4.41667 14 4.41667C15.6079 4.41667 17.7141 4.12429 19.684 3.76792C22.3114 3.29262 24.7074 5.68858 24.2321 8.316C23.8757 10.2859 23.5833 12.3921 23.5833 14C23.5833 15.6079 23.8757 17.7141 24.2321 19.684C24.7074 22.3114 22.3114 24.7074 19.684 24.2321C17.7141 23.8757 15.6079 23.5833 14 23.5833C12.3921 23.5833 10.2859 23.8757 8.316 24.2321C5.68859 24.7074 3.29262 22.3114 3.76792 19.684C4.12429 17.7141 4.41667 15.6079 4.41667 14C4.41667 12.3921 4.12429 10.2859 3.76792 8.316Z',
            duration: .15
        }, {
            morphSVG: 'M3.5 8.49964C3.5 5.73822 5.73822 3.5 8.49964 3.5C10.3275 3.5 12.3499 3.5 14 3.5C15.6501 3.5 17.6725 3.5 19.5004 3.5C22.2618 3.5 24.5 5.73822 24.5 8.49964C24.5 10.3275 24.5 12.3499 24.5 14C24.5 15.6501 24.5 17.6725 24.5 19.5004C24.5 22.2618 22.2618 24.5 19.5004 24.5C17.6725 24.5 15.6501 24.5 14 24.5C12.3499 24.5 10.3275 24.5 8.49964 24.5C5.73822 24.5 3.5 22.2618 3.5 19.5004C3.5 17.6725 3.5 15.6501 3.5 14C3.5 12.3499 3.5 10.3275 3.5 8.49964Z',
            duration: .8,
            ease: 'elastic.out(1, .25)',
            onComplete() {
                element.classList.remove('active')
            }
        })

    })

})

document.querySelectorAll('.radio').forEach(element => {

    let path = element.querySelectorAll('path'),
        input = element.querySelector('input')

    element.addEventListener('pointerdown', e => {
        if(element.classList.contains('active')) {
            return
        }
        gsap.to(path, {
            morphSVG: 'M25.5 14C25.5 19.799 19.799 23.5 14 23.5C8.20101 23.5 2.5 19.799 2.5 14C2.5 8.20101 8.20101 4.5 14 4.5C19.799 4.5 25.5 8.20101 25.5 14Z',
            duration: .15
        })
    })

    element.addEventListener('click', e => {

        if(element.classList.contains('active')) {
            return
        }

        element.classList.add('active')

        gsap.fromTo(path, {
            morphSVG: 'M25.5 14C25.5 19.799 19.799 23.5 14 23.5C8.20101 23.5 2.5 19.799 2.5 14C2.5 8.20101 8.20101 4.5 14 4.5C19.799 4.5 25.5 8.20101 25.5 14Z',
            duration: .15
        }, {
            keyframes: [{
                morphSVG: 'M23.5 14C23.5 19.799 19.799 25.5 14 25.5C8.20101 25.5 4.5 19.799 4.5 14C4.5 8.20101 8.20101 2.5 14 2.5C19.799 2.5 23.5 8.20101 23.5 14Z',
                duration: .15
            }, {
                morphSVG: 'M24.5 14C24.5 19.799 19.799 24.5 14 24.5C8.20101 24.5 3.5 19.799 3.5 14C3.5 8.20101 8.20101 3.5 14 3.5C19.799 3.5 24.5 8.20101 24.5 14Z',
                duration: .6,
                ease: 'elastic.out(1, .6)',
                onComplete() {
                    element.classList.remove('active')
                }
            }]
        })

    })

})

document.querySelectorAll('.switch').forEach(element => {

    let path = element.querySelector('path'),
        input = element.querySelector('input')

    element.addEventListener('mouseenter', e => {
        if(element.classList.contains('active')) {
            return
        }
        gsap.to(path, {
            morphSVG: 'M20 9C20 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 20 5.02944 20 9Z',
            duration: .15
        })
    })

    element.addEventListener('mouseleave', e => {
        if(element.classList.contains('active')) {
            return
        }
        gsap.to(path, {
            morphSVG: 'M18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 18 4.02944 18 9Z',
            duration: .15
        })
    })

    element.addEventListener('click', e => {

        e.preventDefault()

        if(element.classList.contains('active')) {
            return
        }

        element.classList.add('active')

        gsap.to(path, {
            keyframes: [{
                morphSVG: 'M36 9C36 15.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 36 2.02944 36 9Z',
                duration: .15
            }, {
                morphSVG: 'M35.9954 9C35.9954 13.9706 31.9659 18 26.9954 18C22.0248 18 23.9954 12.9706 23.9954 9C23.9954 5.02944 22.0248 0 26.9954 0C31.9659 0 35.9954 4.02944 35.9954 9Z',
                duration: .15
            }, {
                morphSVG: 'M36 9C36 13.9706 31.9706 18 27 18C22.0294 18 18 13.9706 18 9C18 4.02944 22.0294 0 27 0C31.9706 0 36 4.02944 36 9Z',
                duration: .5,
                ease: 'elastic.out(1, .8)',
                onComplete() {
                    input.checked = !input.checked
                    gsap.set(path, {
                        morphSVG: 'M18 9C18 13.9706 13.9706 18 9 18C4.02944 18 0 13.9706 0 9C0 4.02944 4.02944 0 9 0C13.9706 0 18 4.02944 18 9Z'
                    })
                    element.classList.remove('active')
                }
            }]
        })

    })

})
