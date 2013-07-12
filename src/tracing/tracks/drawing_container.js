// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

base.requireStylesheet('tracing.tracks.drawing_container');

base.require('tracing.tracks.track');
base.require('ui');

base.exportTo('tracing.tracks', function() {
  var DrawingContainer = ui.define('drawing-container', tracing.tracks.Track);

  DrawingContainer.prototype = {
    __proto__: tracing.tracks.Track.prototype,

    decorate: function(viewport) {
      tracing.tracks.Track.prototype.decorate.call(this, viewport);
      this.classList.add('drawing-container');

      this.canvas_ = document.createElement('canvas');
      this.canvas_.className = 'drawing-container-canvas';
      this.appendChild(this.canvas_);

      this.ctx_ = this.canvas_.getContext('2d');

      this.viewportChange_ = this.viewportChange_.bind(this);
      this.viewport.addEventListener('change', this.viewportChange_);
    },

    // Needed to support the firstCanvas call in TimelineTrackView.
    get canvas() {
      return this.canvas_;
    },

    context: function() {
      return this.ctx_;
    },

    viewportChange_: function() {
      this.invalidate();
    },

    invalidate: function() {
      if (this.rafPending_)
        return;
      this.rafPending_ = true;

      base.requestPreAnimationFrame(function() {
        this.rafPending_ = false;
        this.ctx_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
        this.updateCanvasSizeIfNeeded_();
      }, this);
    },

    updateCanvasSizeIfNeeded_: function() {
      var headings = this.querySelectorAll('heading');
      if (headings === undefined || headings === null || headings.length === 0)
        return;

      // Find the first heading with size.
      var boundingRect = undefined;
      for (var i = 0; i < headings.length; i++) {
        var rect = headings[i].getBoundingClientRect();
        if (rect.right > 0) {
          boundingRect = rect;
          break;
        }
      }
      if (boundingRect === undefined)
        return;

      var left = parseInt(boundingRect.right);

      var childTrack = this.querySelector('.track');
      var top = childTrack.offsetTop;

      if (this.canvas_.style.top !== top)
        this.canvas_.style.top = top + 'px';
      if (this.canvas_.style.left !== left)
        this.canvas_.style.left = left + 'px';

      var style = window.getComputedStyle(childTrack);
      var innerWidth = parseInt(style.width) -
          parseInt(style.paddingLeft) - parseInt(style.paddingRight) -
          parseInt(style.borderLeftWidth) - parseInt(style.borderRightWidth) -
          (boundingRect.right - boundingRect.left);
      var innerHeight = parseInt(style.height) -
          parseInt(style.paddingTop) - parseInt(style.paddingBottom) -
          parseInt(style.borderTopWidth) - parseInt(style.borderBottomWidth);
      var pixelRatio = window.devicePixelRatio || 1;

      if (this.canvas_.width != innerWidth * pixelRatio) {
        this.canvas_.width = innerWidth * pixelRatio;
        this.canvas_.style.width = innerWidth + 'px';
      }

      if (this.canvas_.height != innerHeight * pixelRatio) {
        this.canvas_.height = innerHeight * pixelRatio;
        this.canvas_.style.height = innerHeight + 'px';
      }
    }
  };

  return {
    DrawingContainer: DrawingContainer
  };
});