// PanZoomControls.js

import * as THREE from 'three';

export class PanZoomControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.enabled = true;

        // Pan state
        this.isPanning = false;
        this.startPan = new THREE.Vector2();
        this.panSpeed = 1.0;
        this.basePanSpeed = 5.0;
        this.referenceZoom = 40; // around the default camera Y start position

        this.panVelocity = new THREE.Vector2(0, 0);
        this.dampingFactor = 0.9;

        // Zoom state
        this.zoomSpeed = 0.5;
        this.minZoom = 2;
        this.maxZoom = 50;
        this.zoomVelocity = 0;
        this.zoomDamping = 0.85;

        // Touch
        this._startDist = 0;
        this._startZoom = camera.position.y;

        // Bind event handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseWheel = this._onMouseWheel.bind(this);

        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);

        this._bindEventListeners();
    }

    _bindEventListeners() {
        this.domElement.addEventListener('mousedown', this._onMouseDown);
        window.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        this.domElement.addEventListener('wheel', this._onMouseWheel, { passive: false });

        this.domElement.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this.domElement.addEventListener('touchmove', this._onTouchMove, { passive: false });
        this.domElement.addEventListener('touchend', this._onTouchEnd);
    }

    _onMouseDown(event) {
        if (!this.enabled) return;
        this.isPanning = true;
        this.startPan.set(event.clientX, event.clientY);
        this.panVelocity.set(0, 0);
    }

    _onMouseMove(event) {
        if (!this.enabled || !this.isPanning) return;

        const zoomFactor = this.camera.position.y / this.referenceZoom;
        const deltaX = (event.clientX - this.startPan.x) * this.basePanSpeed * zoomFactor * 0.01;
        const deltaY = (event.clientY - this.startPan.y) * this.basePanSpeed * zoomFactor * 0.01;

        this.panVelocity.set(-deltaX, -deltaY);

        this.camera.position.x += this.panVelocity.x;
        this.camera.position.z += this.panVelocity.y;

        this.startPan.set(event.clientX, event.clientY);
    }

    _onMouseUp() {
        this.isPanning = false;
    }

    _onMouseWheel(event) {
        if (!this.enabled) return;
        event.preventDefault();

        const direction = event.deltaY > 0 ? 1 : -1;
        this.zoomVelocity += direction * this.zoomSpeed * 0.5;
    }

    _onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isPanning = true;
            this.startPan.set(event.touches[0].clientX, event.touches[0].clientY);
            this.panVelocity.set(0, 0);
        }

        if (event.touches.length === 2) {
            this._startDist = this._touchDistance(event);
            this._startZoom = this.camera.position.y;
        }
    }

    _onTouchMove(event) {
        event.preventDefault();

        if (event.touches.length === 1 && this.isPanning) {
            const zoomFactor = this.camera.position.y / this.referenceZoom;
            const deltaX = (event.touches[0].clientX - this.startPan.x) * this.basePanSpeed * zoomFactor * 0.01;
            const deltaY = (event.touches[0].clientY - this.startPan.y) * this.basePanSpeed * zoomFactor * 0.01;

            this.panVelocity.set(-deltaX, -deltaY);

            this.camera.position.x += this.panVelocity.x;
            this.camera.position.z += this.panVelocity.y;

            this.startPan.set(event.touches[0].clientX, event.touches[0].clientY);
        }

        if (event.touches.length === 2) {
            const newDist = this._touchDistance(event);
            const zoomDelta = (this._startDist - newDist) * 0.1;

            this.zoomVelocity += zoomDelta * this.zoomSpeed * 0.03;
        }
    }

    _onTouchEnd() {
        this.isPanning = false;
    }

    _touchDistance(event) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update() {
        if (!this.enabled) return;

        // Apply zoom damping
        if (Math.abs(this.zoomVelocity) > 0.001) {
            this.camera.position.y = THREE.MathUtils.clamp(
                this.camera.position.y + this.zoomVelocity,
                this.minZoom,
                this.maxZoom
            );
            this.zoomVelocity *= this.zoomDamping;
        } else {
            this.zoomVelocity = 0;
        }

        // Apply pan inertia
        if (!this.isPanning && (Math.abs(this.panVelocity.x) > 0.001 || Math.abs(this.panVelocity.y) > 0.001)) {
            this.camera.position.x += this.panVelocity.x;
            this.camera.position.z += this.panVelocity.y;

            this.panVelocity.multiplyScalar(this.dampingFactor);
        } else if (!this.isPanning) {
            this.panVelocity.set(0, 0);
        }
    }

    dispose() {
        this.domElement.removeEventListener('mousedown', this._onMouseDown);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.domElement.removeEventListener('wheel', this._onMouseWheel);

        this.domElement.removeEventListener('touchstart', this._onTouchStart);
        this.domElement.removeEventListener('touchmove', this._onTouchMove);
        this.domElement.removeEventListener('touchend', this._onTouchEnd);
    }
}
