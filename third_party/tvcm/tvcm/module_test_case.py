# Copyright 2014 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.
import unittest
import sys
import os
import json


from tvcm import dev_server
from tvcm import browser_controller
from tvcm import resource_loader


_currently_active_module_test_suite = None


class ModuleTestSuite(unittest.TestSuite):
  def __init__(self, project):
    super(ModuleTestSuite, self).__init__()
    self._project = project
    self._bc = None

  def recreateEmptyVersion(self):
    return ModuleTestSuite(self._project)

  def run(self, result):
    self.setUp()
    try:
      super(ModuleTestSuite, self).run(result)
    finally:
      self.tearDown()

  @property
  def bc(self):
    return self._bc

  def setUp(self):
    self._bc = browser_controller.BrowserController(self._project)
    self._bc.NavigateToPath('/base/unittest/module_test_case_runner.html')

    global _currently_active_module_test_suite
    assert _currently_active_module_test_suite == None
    _currently_active_module_test_suite = self

  def tearDown(self):
    if self._bc:
      self._bc.Close()
      self._bc = None

    global _currently_active_module_test_suite
    _currently_active_module_test_suite = None

def DiscoverTestsInModule(project, start_path):
  if not browser_controller.IsSupported():
    raise Exception('Cannot run all tests: telemetry could not be found')
  rl = resource_loader.ResourceLoader(project)

  test_modules = project.FindAllTestModuleNames(start_path=start_path)

  bc = browser_controller.BrowserController(project)

  bc.NavigateToPath('/base/unittest/module_test_case_runner.html')
  try:
    if bc.EvaluateJavaScript('base.hasPanic()'):
      raise Exception('Runner failure: %s' % bc.EvaluateJavaScript('base.getPanicText()'))

    tests = bc.EvaluateThennableAndWait(
      'discoverTestsInModules(%s)' % json.dumps(test_modules))

    if bc.EvaluateJavaScript('base.hasPanic()'):
      raise Exception('Test loading failure: %s' % bc.EvaluateJavaScript('base.getPanicText()'))

    suite = ModuleTestSuite(project)
    for fully_qualified_test_name in tests:
      suite.addTest(ModuleTestCase(fully_qualified_test_name))
    return suite
  finally:
    bc.Close()



class ModuleTestCase(unittest.TestCase):
  def __init__(self, fully_qualified_test_name):
    super(ModuleTestCase, self).__init__(methodName='runTest')
    self.fully_qualified_test_name = fully_qualified_test_name

  def id(self):
    return self.fully_qualified_test_name

  def shortDescription(self):
    return None

  def __str__(self):
    i = self.fully_qualified_test_name.rfind('.')
    modname = self.fully_qualified_test_name[0:i]
    testname = self.fully_qualified_test_name[i+1:]
    return '%s (%s)' % (testname, modname)

  def runTest(self):
    mts = _currently_active_module_test_suite
    assert mts, 'Something is wrong: ModuleTestCase can only be run inside a ModuleTestSuite.run()'

    bc = mts.bc
    res = bc.EvaluateThennableAndWait(
      'runTestNamed(%s)' % json.dumps(self.fully_qualified_test_name))